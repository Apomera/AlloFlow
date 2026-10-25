import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const labels = { 'export.name_label': 'Name', 'export.date_label': 'Date', 'output.header_score': 'Score' };
let pipeline;
beforeAll(() => {
  window.React = window.React || {};
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    addToast: () => {}, t: key => labels[key] || key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Resource',
    state: { currentUiLanguage: 'English', leveledTextLanguage: 'English' },
  });
});

const glossary = () => ({ id: 'words', type: 'glossary', title: 'Words to use', meta: '', data: [{ term: 'Evidence', def: 'Information supporting or questioning an idea.' }] });
const notebook = () => ({ id: 'notes', type: 'note-taking', title: 'My reasoning record', meta: '', data: { templateType: 'cornell-notes', cues: [{ id: 'cue', text: 'My reason', guidance: 'Explain what the evidence supports.' }], notes: [{ id: 'note', text: '' }], summary: '' } });
const quiz = () => ({ id: 'questions', type: 'quiz', title: 'Check a reason', meta: '', data: { questions: [{ type: 'mcq', question: 'What supports an idea?', options: ['Evidence', 'Volume'], correctAnswer: 'Evidence' }], reflections: [] } });
const math = () => ({ id: 'calculations', type: 'math', title: 'Check the total', meta: '', data: { problems: [{ question: '1 + 1 = ?', answer: '2', steps: [{ explanation: 'Add one to one.' }] }] } });
function render(items, options = {}, worksheet = true) {
  const exportConfig = { includeTeacherKey: false, ...options };
  const html = pipeline.generateFullPackHTML(items, 'Prepared handout', worksheet, {}, exportConfig);
  return { document: new DOMParser().parseFromString(html, 'text/html'), exportConfig };
}
function expectIdentityFields(document) {
  const header = document.querySelector('.worksheet-header');
  expect(header).not.toBeNull();
  const labels = [...header.querySelectorAll('.label')].map(node => node.textContent.trim());
  expect(labels).toContain('Name:'); expect(labels).toContain('Date:');
  return header;
}

describe('worksheet header matches the printed resource purpose', () => {
  it.each([['glossary', glossary], ['notebook', notebook]])('keeps identification fields without a score field on an ungraded %s', (_name, make) => {
    const item = make(), before = structuredClone(item), { document } = render([item]);
    const header = expectIdentityFields(document);
    expect(header.querySelector('[data-alloflow-worksheet-score]')).toBeNull();
    expect([...header.querySelectorAll('.label')].map(node => node.textContent.trim())).not.toContain('Score:');
    expect(document.querySelector(`[data-alloflow-resource-id="${item.id}"]`)).not.toBeNull();
    expect(item).toEqual(before);
  });

  it.each([['quiz', quiz], ['math', math]])('retains a score field when the printed sheet includes %s work', (_name, make) => {
    const item = make(), before = structuredClone(item), { document } = render([item]);
    const header = expectIdentityFields(document);
    expect(header.querySelectorAll('[data-alloflow-worksheet-score]')).toHaveLength(1);
    expect(header.querySelector('[data-alloflow-worksheet-score] .label').textContent.trim()).toBe('Score:');
    expect(item).toEqual(before);
  });

  it.each([['glossary', glossary], ['notebook', notebook]])('allows an explicit assessment to request a score field on a %s', (_name, make) => {
    const item = make(), before = structuredClone(item), options = { assessmentMode: true, includeTeacherKey: true };
    const { document, exportConfig } = render([item], options);
    expect(expectIdentityFields(document).querySelectorAll('[data-alloflow-worksheet-score]')).toHaveLength(1);
    expect(document.querySelector('.teacher-view')).toBeNull();
    expect(exportConfig).toEqual(options);
    expect(item).toEqual(before);
  });

  it('does not infer a score field from quiz or math resources excluded by export filters', () => {
    const items = [glossary(), quiz(), math()], before = structuredClone(items);
    const { document } = render(items, { includeQuiz: false, includeMath: false });
    expect([...document.querySelectorAll('[data-alloflow-resource-id]')].map(node => node.dataset.alloflowResourceId)).toEqual(['words']);
    expect(expectIdentityFields(document).querySelector('[data-alloflow-worksheet-score]')).toBeNull();
    expect(items).toEqual(before);
  });

  it('retains the score field when filtering leaves the scored resource in the output', () => {
    const items = [glossary(), quiz()], before = structuredClone(items);
    const { document } = render(items, { includeGlossary: false });
    expect([...document.querySelectorAll('[data-alloflow-resource-id]')].map(node => node.dataset.alloflowResourceId)).toEqual(['questions']);
    expect(expectIdentityFields(document).querySelector('[data-alloflow-worksheet-score]')).not.toBeNull();
    expect(items).toEqual(before);
  });

  it('keeps pupil identification and score fields out of a teacher-only guide export', () => {
    const item = { id: 'teacher', type: 'lesson-plan', title: 'Teaching guide', meta: '', config: { generationInputs: { mode: 'teacher' } }, data: { objectives: ['Explain a reason.'], hook: 'Model one exchange.', guidedPractice: 'Check the partner’s meaning.', closure: 'Choose one next step.' } };
    const before = structuredClone(item), { document } = render([item], { audience: 'teacher' });
    expect(document.querySelector('.worksheet-header')).toBeNull();
    expect(document.querySelector('[data-alloflow-worksheet-score]')).toBeNull();
    expect(document.querySelector('.alloflow-teacher-plan')).not.toBeNull();
    expect(item).toEqual(before);
  });

  it('does not add a worksheet header to an interactive export', () => {
    const { document } = render([quiz()], {}, false);
    expect(document.querySelector('.worksheet-header')).toBeNull();
    expect(document.querySelector('[data-alloflow-worksheet-score]')).toBeNull();
  });
});
