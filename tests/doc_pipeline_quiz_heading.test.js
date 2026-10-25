import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const headingLabels = {
  'output.quiz_mcq': 'Multiple Choice',
  'output.quiz_open_responses': 'Open responses',
  'output.quiz_questions': 'Questions',
};
const translate = key => headingLabels[key] || key;
const choice = (type = 'mcq') => ({ ...(type ? { type } : {}), question: 'What supports a claim?', options: ['Relevant evidence', 'Faster speech'], correctAnswer: 'Relevant evidence' });
const open = (type = 'short-answer') => ({ type, question: 'Explain how a fact supports your reason.', expectedAnswer: 'The response connects a relevant fact to the reason.' });
const quiz = (id, questions) => ({ id, type: 'quiz', title: id, meta: '', data: { questions, reflections: [] } });

beforeAll(() => {
  window.React = window.React || {};
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('catalog_module.js');
});

function render(items, { translator = translate, worksheet = true, includeTeacherKey = false } = {}) {
  const pipeline = window.AlloModules.createDocPipeline({
    addToast: () => {}, t: translator, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Resource',
    state: { currentUiLanguage: 'English', leveledTextLanguage: 'English' },
  });
  const html = pipeline.generateFullPackHTML(items, 'Question formats', worksheet, {}, { includeTeacherKey });
  return new DOMParser().parseFromString(html, 'text/html');
}
const headings = document => [...document.querySelectorAll('.quiz-box > h3')].map(node => node.textContent);

describe('shared per-resource quiz headings', () => {
  it.each(['short-answer', 'shortAnswer', 'self-explanation'])('labels the native %s format as an open response without changing its questions or answers', type => {
    const resource = quiz('written', [open(type), open()]), before = structuredClone(resource);
    const document = render([resource]);
    expect(headings(document)).toEqual(['Open responses']);
    expect(document.querySelectorAll('.question')).toHaveLength(2);
    expect([...document.querySelectorAll('.question')].every(node => ['short-answer', 'self-explanation'].includes(node.dataset.itemType))).toBe(true);
    expect(resource).toEqual(before);
  });

  it.each(['mcq', undefined])('retains the multiple-choice label for explicit or legacy MCQ type %j', type => {
    const resource = quiz('choice', [choice(type === undefined ? null : type)]), before = structuredClone(resource);
    const document = render([resource]);
    expect(headings(document)).toEqual(['Multiple Choice']);
    expect(document.querySelector('.question').dataset.itemType).toBe('mcq');
    expect(resource).toEqual(before);
  });

  it('classifies each quiz independently in a mixed packet and preserves its answer-key content', () => {
    const resources = [quiz('written', [open()]), quiz('choice', [choice()]), quiz('mixed', [choice(), open()])], before = structuredClone(resources);
    const document = render(resources, { includeTeacherKey: true });
    const main = document.getElementById('main-export-content');
    expect([...main.querySelectorAll(':scope > .alloflow-resource-wrap .quiz-box > h3')].map(n => n.textContent)).toEqual(['Open responses', 'Multiple Choice', 'Questions']);
    expect(document.querySelector('.teacher-view').textContent).toContain('Relevant evidence');
    expect(document.querySelector('.teacher-view').textContent).toContain(open().expectedAnswer);
    expect(resources).toEqual(before);
  });

  it.each([
    { type: 'numeric-response', question: 'Enter the result.', correctValue: 4 },
    { type: 'multi-select', question: 'Select the relevant facts.', options: ['A', 'B'], correctAnswers: ['A'] },
  ])('uses a generic heading for the specialized $type format', question => {
    expect(headings(render([quiz('specialized', [question])]))).toEqual(['Questions']);
  });

  it.each([undefined, null, '', 'output.quiz_open_responses', { missing: true }])('uses readable English when the heading translation is unavailable: %j', label => {
    const document = render([quiz('written', [open()])], { translator: key => key === 'output.quiz_open_responses' ? label : translate(key) });
    expect(headings(document)).toEqual(['Open responses']);
  });

  it('renders localized heading text safely', () => {
    const label = 'Réponses ouvertes <img src=x onerror=alert(1)>';
    const document = render([quiz('written', [open()])], { translator: key => key === 'output.quiz_open_responses' ? label : translate(key) });
    const heading = document.querySelector('.quiz-box > h3');
    expect(heading.textContent).toBe(label);
    expect(heading.querySelector('img')).toBeNull();
  });

  it('gives app and catalog exports the same per-resource labels without a pack-wide override', async () => {
    const pack = { allopack: { spec: '0.1', title: 'Mixed question formats', language: 'en' }, history: [quiz('written', [open()]), quiz('choice', [choice()]), quiz('mixed', [choice(), open()])] };
    const before = structuredClone(pack);
    const html = await window.AlloModules.CommunityCatalog._generateCatalogPreview(pack, { title: pack.allopack.title }, 'all');
    const catalogDocument = new DOMParser().parseFromString(html, 'text/html');
    expect(headings(catalogDocument)).toEqual(headings(render(pack.history)));
    expect(headings(catalogDocument)).toEqual(['Open responses', 'Multiple Choice', 'Questions']);
    expect(pack).toEqual(before);
  });

  it('uses the shared open-response heading for the current Katie exit task', () => {
    const pack = JSON.parse(readFileSync('allopacks/academic_discourse_reading_space_grade6.allopack.json', 'utf8'));
    const exit = pack.history.find(item => item.id === 'reading-space-exit'), before = structuredClone(exit);
    expect(headings(render([exit]))).toEqual(['Open responses']);
    expect(exit).toEqual(before);
  });
});
