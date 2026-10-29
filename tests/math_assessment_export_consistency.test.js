import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let pipeline;
let separateStudentTeacherHtml;
beforeAll(() => {
  window.React = window.React || {};
  loadAlloModule('text_pipeline_helpers_module.js');
  window.processMathHTML = window.AlloModules.TextPipelineHelpers.processMathHTML;
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_handlers_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Resource',
    state: { currentUiLanguage: 'English', leveledTextLanguage: 'English' },
  });
  separateStudentTeacherHtml = window.AlloModules.ExportHandlers.separateStudentTeacherHtml;
});

const questions = [
  'Edited question A: Add one half and one third.',
  'Edited question B: Write x multiplied by x as a power.',
];
const explanations = [
  'Edited explanation A: Rename both fractions in sixths.',
  'Edited explanation B: The two factors share base x.',
];
function savedMath() {
  // A saved resource contains the latest teacher edits, including exact LaTeX.
  // This is a storage round-trip fixture, not a model-generated answer.
  const edited = {
    id: 'saved-assessment-math', type: 'math', title: 'Edited assessment', meta: '',
    data: { title: 'Edited assessment', problems: [
      { id: 'fractions', question: questions[0], answer: '\\frac{5}{6}', steps: [
        { explanation: explanations[0], latex: '\\frac{3}{6}+\\frac{2}{6}=\\frac{5}{6}' },
      ] },
      { id: 'power', question: questions[1], answer: 'x^{2}', steps: [
        { explanation: explanations[1], latex: 'x \\times x = x^{2}' },
      ] },
    ] },
  };
  return JSON.parse(JSON.stringify(edited));
}
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const mathLabels = root => [...root.querySelectorAll('.math-symbol[role="math"]')]
  .map(node => node.getAttribute('aria-label'));
const visibleText = root => (root.body || root).textContent;
const teacherMathLabels = [
  questions[0], '3 over 6 plus 2 over 6 equals 5 over 6', '5 over 6',
  questions[1], 'x times x equals x to the power 2', 'x to the power 2',
];
function expectStudentMath(root) {
  expect(mathLabels(root)).toEqual(questions);
  for (const explanation of explanations) expect(visibleText(root)).not.toContain(explanation);
  expect(root.querySelector('.alloflow-math-solution')).toBeNull();
  const markup = root.outerHTML || root.documentElement.outerHTML;
  expect(markup).not.toContain('5 over 6');
  expect(markup).not.toContain('x to the power 2');
}
function expectTeacherMath(root) {
  expect(mathLabels(root)).toEqual(teacherMathLabels);
  for (const explanation of explanations) expect(visibleText(root)).toContain(explanation);
  expect(root.querySelectorAll('li')).toHaveLength(2);
  expect(root.querySelectorAll('.math-fraction').length).toBeGreaterThan(0);
  expect([...root.querySelectorAll('sup')].map(node => node.textContent)).toContain('2');
}

describe('saved Math assessment export consistency', () => {
  it.each([false, true])('exports exact edited questions, keys and steps for a teacher (worksheet=%s)', isWorksheet => {
    const resource = savedMath();
    const before = JSON.stringify(resource);
    const document = parse(pipeline.generateResourceHTML(resource, true, {}, { isWorksheet }));
    expectTeacherMath(document);
    expect(JSON.stringify(resource)).toBe(before);
  });

  it.each([false, true])('exports the same questions without keys or worked steps for students (worksheet=%s)', isWorksheet => {
    const resource = savedMath();
    const before = JSON.stringify(resource);
    const document = parse(pipeline.generateResourceHTML(resource, false, {}, { isWorksheet }));
    expectStudentMath(document);
    expect(JSON.stringify(resource)).toBe(before);
  });

  it('keeps the full-pack student copy safe while preserving the exact teacher appendix', () => {
    const resource = savedMath();
    const before = JSON.stringify(resource);
    const html = pipeline.generateFullPackHTML([resource], 'Math assessment', true, {}, { includeTeacherKey: true });
    const copies = separateStudentTeacherHtml(html);
    const student = parse(copies.studentHtml);
    const teacher = parse(copies.teacherHtml);
    expectStudentMath(student.querySelector('.alloflow-math-section'));
    expect(student.querySelector('.teacher-view')).toBeNull();
    expectTeacherMath(teacher.querySelector('.teacher-view .alloflow-math-section'));
    expect(JSON.stringify(resource)).toBe(before);
  });

  it('assessment mode cannot restore a teacher key through a stale includeTeacherKey preference', () => {
    const resource = savedMath();
    const options = { includeTeacherKey: true, assessmentMode: true };
    const document = parse(pipeline.generateFullPackHTML([resource], 'Math assessment', true, {}, options));
    expectStudentMath(document.querySelector('.alloflow-math-section'));
    expect(document.querySelector('.teacher-view')).toBeNull();
    expect(options).toEqual({ includeTeacherKey: true, assessmentMode: true });
  });

  it('switching resources and repeating an export cannot reuse an earlier key or question', () => {
    const first = savedMath();
    const next = JSON.parse(JSON.stringify(first));
    next.id = 'replacement-math';
    next.data.problems = [{ id: 'new', question: 'Replacement question: Seven plus eight.', answer: '15', steps: [{ explanation: 'Replacement explanation: Count eight after seven.', latex: '7+8=15' }] }];
    const firstHtml = pipeline.generateResourceHTML(first, true, {}, { isWorksheet: true });
    const nextDoc = parse(pipeline.generateResourceHTML(next, true, {}, { isWorksheet: true }));
    expect(mathLabels(nextDoc)).toEqual(['Replacement question: Seven plus eight.', '7 plus 8 equals 15', '15']);
    expect(nextDoc.body.textContent).not.toContain(questions[0]);
    expect(nextDoc.body.textContent).not.toContain(explanations[0]);
    expect(pipeline.generateResourceHTML(first, true, {}, { isWorksheet: true })).toBe(firstHtml);
  });

  it('preserves a valid numeric zero answer key', () => {
    const resource = { id: 'zero-math', type: 'math', title: 'Zero', meta: '', data: { problems: [
      { question: 'Subtract five from five.', answer: 0, steps: [{ explanation: 'Equal amounts leave zero.', latex: '5-5=0' }] },
    ] } };
    const document = parse(pipeline.generateResourceHTML(resource, true, {}, { isWorksheet: true }));
    expect(mathLabels(document)).toEqual(['Subtract five from five.', '5 minus 5 equals 0', '0']);
    expect(document.querySelectorAll('.math-symbol')[2].textContent).toBe('0');
  });
});
