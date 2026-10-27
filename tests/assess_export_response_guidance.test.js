import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let pipeline;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  new Function(readFileSync('doc_pipeline_source.jsx', 'utf8'))();
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => { throw Error('Local export only'); },
    callGeminiVision: async () => { throw Error('Local export only'); },
    callImagen: async () => null, addToast() {}, t: key => key,
    isRtlLang: () => false, updateExportPreview() {}, getDefaultTitle: () => 'Assess',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {} }
  });
});
const config = { includeTeacherKey: false, includeOriginalReading: false };
const quiz = (id, questions) => ({ id, type: 'quiz', title: 'Response guidance', data: { questions } });
const guidance = { question: 'Describe the measured change.', question_en: 'Explain the difference.', studentCriteria: ['Use the observed evidence.'] };
const questions = [
  { ...guidance, type: 'numeric-response', unit: 'cm', correctValue: 17, numericSettings: { allowEquivalentUnits: true } },
  { ...guidance, type: 'sequence-sense', items: ['Seed', 'Shoot'], presentedOrder: [1, 0], orderingPrinciple: 'growth', principleOptions: ['growth', 'size'] },
  { ...guidance, type: 'answer-evidence', answerOptions: ['A', 'B'], evidenceOptions: ['Evidence'], requireReasoning: true, explanationPrompt: 'Explain your connection.' }
];
function render(items, full = true) {
  const html = full ? pipeline.generateFullPackHTML(items, 'Assess', false, {}, config) : pipeline.generateResourceHTML(items[0], false, {}, config);
  return { html, doc: new DOMParser().parseFromString(html, 'text/html') };
}
function activate(html, doc) {
  const start = html.indexOf('const _DEFAULT_MAX = 1500;');
  const end = html.indexOf('// ── Same behavior for fill-in-the-blank inputs', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  new Function('document', 'textareas', '_docKey', '_hash', '_v2ResponsePrefix', '_storageEnabled', html.slice(start, end))(
    doc, doc.querySelectorAll('.interactive-textarea'), 'test', value => value, 'v2:', false
  );
}
const relatedText = (doc, node, attr) => (node.getAttribute(attr) || '').split(/\s+/).filter(Boolean).map(id => {
  const target = doc.getElementById(id); expect(target, id).toBeTruthy(); return target.textContent;
}).join(' ');

describe('Exported Assess response guidance and reset', () => {
  it('describes legacy exact spelling while respecting an explicit answer-matching policy', () => {
    const legacy = { type: 'fill-blank', question: 'Complete the sentence.', spellingPolicy: 'exact', expectedFill: 'Water' };
    const { doc } = render([quiz('legacy-spelling', [legacy, { ...legacy, fillBlankPolicy: 'normalized' }])], false);
    const fields = doc.querySelectorAll('[data-item-type="fill-blank"] input');
    expect(relatedText(doc, fields[0], 'aria-describedby')).toBe('Use exact spelling and capitalization.');
    expect(relatedText(doc, fields[1], 'aria-describedby')).toBe('Capitalization, extra spacing, and punctuation around the answer are ignored.');
  });

  it.each([false, true])('names numeric, sequence, and reasoning fields with their question and instructions (full: %s)', full => {
    const { doc } = render([quiz('guidance', questions)], full);
    const fields = doc.querySelectorAll('[data-item-type="numeric-response"] input,[data-item-type="sequence-sense"] input:not([type=radio]),[data-item-type="sequence-sense"] select,[data-assessment-reasoning] textarea');
    expect(fields).toHaveLength(6);
    for (const field of fields) {
      expect(relatedText(doc, field, 'aria-labelledby')).toContain('Describe the measured change.');
      expect(relatedText(doc, field, 'aria-labelledby')).toContain(field.labels[0].textContent);
      expect(relatedText(doc, field, 'aria-describedby')).toContain('Use the observed evidence.');
      expect(relatedText(doc, field, 'aria-describedby')).toContain('Explain the difference.');
    }
    expect(relatedText(doc, fields[0], 'aria-describedby')).toContain('Equivalent units are accepted.');
    expect(fields[5].required).toBe(true);
    const ids = [...doc.querySelectorAll('.quiz-box [id]')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('describes character limits without announcing every keystroke and gives a persistent limit notice', () => {
    const { html, doc } = render([quiz('limits', [questions[2], { ...guidance, type: 'short-answer' }])]);
    activate(html, doc);
    const fields = [...doc.querySelectorAll('.quiz-box textarea')];
    const first = fields[0], counter = first.nextElementSibling, notice = counter.nextElementSibling;
    expect(counter.className).toBe('allo-ta-counter'); expect(counter.hasAttribute('aria-live')).toBe(false);
    expect(relatedText(doc, first, 'aria-describedby')).toContain('0 / 1500 characters');
    expect(relatedText(doc, first, 'aria-describedby')).toContain('Use the observed evidence.');
    expect(notice.getAttribute('role')).toBe('status'); expect(notice.textContent).toBe('');
    first.value = 'An explanation'; first.dispatchEvent(new Event('input', { bubbles: true }));
    expect(counter.textContent).toBe('14 / 1500 characters'); expect(notice.textContent).toBe('');
    first.value = 'x'.repeat(1500); first.dispatchEvent(new Event('input', { bubbles: true }));
    expect(notice.textContent).toContain('Character limit reached'); expect(counter.nextElementSibling).toBe(notice);
    first.value = 'x'.repeat(1499); first.dispatchEvent(new Event('input', { bubbles: true }));
    expect(notice.textContent).toBe('');
    expect(new Set(fields.map(field => field.nextElementSibling.id)).size).toBe(2);
  });

  it('announces reset for written-only quizzes, refreshes counters, and leaves other quizzes untouched', () => {
    const { html, doc } = render([quiz('first', [{ ...guidance, type: 'short-answer' }]), quiz('second', [{ ...guidance, type: 'short-answer' }])]);
    activate(html, doc);
    const [first, second] = doc.querySelectorAll('.quiz-box');
    const field = first.querySelector('textarea'), other = second.querySelector('textarea');
    field.value = 'x'.repeat(1500); other.value = 'Keep this response.';
    field.dispatchEvent(new Event('input', { bubbles: true })); other.dispatchEvent(new Event('input', { bubbles: true }));
    const status = first.querySelector('.quiz-results');
    expect(status.hidden).toBe(false); expect(status.getAttribute('role')).toBe('status');
    expect(first.querySelector('.quiz-check-btn').hidden).toBe(true);
    const changed = []; first.addEventListener('change', event => changed.push(event.target.value));
    first.querySelector('.quiz-reset-btn').click();
    expect(field.value).toBe(''); expect(field.nextElementSibling.textContent).toBe('0 / 1500 characters');
    expect(first.querySelector('.allo-quiz-limit-notice').textContent).toBe('');
    expect(status.textContent).toBe('Responses cleared.'); expect(first.querySelector('.quiz-results')).toBe(status);
    expect(changed).toEqual(['']); expect(other.value).toBe('Keep this response.'); expect(second.querySelector('.quiz-results').textContent).toBe('');
  });
});
