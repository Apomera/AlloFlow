import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let pipeline, root, host;
const image = 'data:image/png;base64,iVBORw0KGgo=';
beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = {};
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('quiz_mode_strategies.js');
  loadAlloModule('view_sidebar_panels_module.js');
  new Function(readFileSync('doc_pipeline_source.jsx', 'utf8'))();
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => { throw new Error('This export must be local.'); },
    callGeminiVision: async () => { throw new Error('This export must be local.'); },
    callImagen: async () => null, addToast: () => {}, t: key => key,
    isRtlLang: language => /^(Arabic|ar)$/i.test(language), updateExportPreview: () => {},
    getDefaultTitle: () => 'Assessment',
    state: { leveledTextLanguage: 'French', currentUiLanguage: 'Spanish', exportConfig: {} }
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; localStorage.clear();
});
function quiz(overrides = {}) {
  return { id: 'accessible-quiz', type: 'quiz', title: 'Assessment',
    config: { language: 'Spanish', translationPolicy: { target: 'Arabic' } },
    data: { questions: [{ type: 'mcq', question: 'Read the graph.', question_en: 'اقرأ الرسم البياني.',
      options: ['A', 'B'], options_en: ['أ', 'ب'], correctAnswer: 'B',
      imageUrl: image, imageAltText: 'A "label" & a value < 20; not <img onerror="alert(1)">.',
      optionImageUrls: [image], optionImageAltTexts: ['Option "A": 10 & 12 < 20.'] }],
      reflections: [{ text: 'Explain.', text_en: 'اشرح.' }], ...overrides }
  };
}
function render(item, full = false) {
  const config = { includeTeacherKey: false, includeOriginalReading: false };
  const html = full ? pipeline.generateFullPackHTML([item], 'Assessment', false, {}, config)
    : pipeline.generateResourceHTML(item, false, {}, config);
  return { html, doc: new DOMParser().parseFromString(html, 'text/html') };
}
describe('Assessment export accessibility', () => {
  it.each([false, true])('preserves escaped authored visual descriptions and saved companion language (full pack: %s)', full => {
    const item = quiz(), before = JSON.stringify(item), { doc } = render(item, full);
    const images = doc.querySelectorAll('.quiz-box img');
    expect(images).toHaveLength(2);
    expect(images[0].alt).toBe(item.data.questions[0].imageAltText);
    expect(images[1].alt).toBe(item.data.questions[0].optionImageAltTexts[0]);
    expect(doc.querySelector('[onerror]')).toBeNull();
    const companions = Array.from(doc.querySelectorAll('.quiz-box [lang]'));
    expect(companions).toHaveLength(4);
    for (const companion of companions) {
      expect(companion.lang).toBe('ar');
      expect(companion.dir).toBe('rtl');
    }
    expect(JSON.stringify(item)).toBe(before);
  });
  it('keeps legacy companion fields English regardless of current app settings', () => {
    const item = quiz(); item.config = { language: 'Spanish' };
    const { doc } = render(item);
    for (const companion of doc.querySelectorAll('.quiz-box [lang]')) {
      expect(companion.lang).toBe('en'); expect(companion.dir).toBe('ltr');
    }
  });
  it('preserves explicitly decorative image alternatives', () => {
    const item = quiz(); item.data.questions[0].imageAltText = ''; item.data.questions[0].optionImageAltTexts = [''];
    expect(Array.from(render(item).doc.querySelectorAll('.quiz-box img'), node => node.alt)).toEqual(['', '']);
  });
  it.each([false, true])('connects all nine formats and written responses to their question and response guidance (full pack: %s)', full => {
    const types = ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'];
    const questions = types.map(type => ({ ...quiz().data.questions[0], type, question: type + ': explain the graph.', studentCriteria: ['Compare the two values.'], fillBlankPolicy: 'exact', items: ['First', 'Next'], pairs: [{ left: 'Root', right: 'Light' }], answerOptions: ['A', 'B'], evidenceOptions: ['Evidence'], correctValue: 2 }));
    const { doc } = render(quiz({ questions }), full);
    const groups = Array.from(doc.querySelectorAll('.quiz-box .question'));
    expect(groups).toHaveLength(9);
    groups.forEach((group, index) => {
      expect(group.getAttribute('role')).toBe('group');
      expect(doc.getElementById(group.getAttribute('aria-labelledby')).textContent).toBe((index + 1) + '. ' + questions[index].question);
      const descriptions = group.getAttribute('aria-describedby').split(' ').map(id => doc.getElementById(id).textContent);
      expect(descriptions.join(' ')).toContain('Compare the two values.');
      if (questions[index].type === 'fill-blank') expect(descriptions.join(' ')).toContain('Use exact spelling and capitalization.');
    });
    for (const control of doc.querySelectorAll('[data-item-type="short-answer"] textarea,[data-item-type="self-explanation"] textarea,[data-item-type="fill-blank"] input')) {
      const labels = control.getAttribute('aria-labelledby').split(' ').map(id => doc.getElementById(id).textContent).join(' ');
      expect(labels).toContain('explain the graph.');
      expect(control.getAttribute('aria-describedby')).toContain('_criteria');
      expect(control.getAttribute('aria-describedby')).toContain('_translation');
    }
    const ids = Array.from(doc.querySelectorAll('.quiz-box [id]'), element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('describes each checked result to its radio group and clears feedback on reset without changing scoring', () => {
    const question = quiz().data.questions[0];
    const { html, doc } = render(quiz({ questions: [question, question, question] }), true);
    const start = html.indexOf("document.querySelectorAll('.quiz-box').forEach((quiz) => {");
    const end = html.indexOf('// ── Same behavior for fill-in-the-blank inputs', start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    new Function('document', html.slice(start, end))(doc);
    const questions = Array.from(doc.querySelectorAll('.quiz-box .question'));
    questions[0].querySelector('input[value="1"]').checked = true;
    questions[1].querySelector('input[value="0"]').checked = true;
    doc.querySelector('.quiz-check-btn').click();
    const labels = ['Correct', 'Review needed', 'Unanswered'];
    questions.forEach((question, index) => {
      const group = question.querySelector('[role="radiogroup"]');
      const feedback = doc.getElementById(group.getAttribute('aria-describedby'));
      expect(feedback.textContent).toBe(labels[index]);
      expect(feedback.hidden).toBe(false);
      expect(feedback.getAttribute('aria-hidden')).not.toBe('true');
      expect(group.getAttribute('aria-invalid')).toBe(index === 1 ? 'true' : null);
    });
    expect(doc.querySelector('.quiz-results').textContent).toBe('1 of 3 correct · 1 to review · 1 unanswered');
    const editedChoice = questions[1].querySelector('input[value="1"]');
    editedChoice.checked = true;
    editedChoice.dispatchEvent(new Event('change', { bubbles: true }));
    expect(questions[1].querySelector('.alloflow-quiz-feedback').hidden).toBe(true);
    expect(questions[1].querySelector('[aria-invalid]')).toBeNull();
    expect(questions[0].querySelector('.alloflow-quiz-feedback').textContent).toBe('Correct');
    expect(questions[2].querySelector('.alloflow-quiz-feedback').textContent).toBe('Unanswered');
    expect(doc.querySelector('.quiz-results').textContent).toContain('An answer changed.');
    doc.querySelector('.quiz-check-btn').click();
    expect(doc.querySelector('.quiz-results').textContent).toBe('2 of 3 correct · 1 unanswered');
    expect(questions[1].querySelector('.alloflow-quiz-feedback').textContent).toBe('Correct');
    doc.querySelector('.quiz-reset-btn').click();
    expect(doc.querySelectorAll('input:checked')).toHaveLength(0);
    expect(doc.querySelector('.quiz-results').textContent).toBe('Responses cleared.');
    for (const feedback of doc.querySelectorAll('.alloflow-quiz-feedback')) {
      expect(feedback.hidden).toBe(true); expect(feedback.textContent).toBe('');
    }
    expect(doc.querySelector('[aria-invalid]')).toBeNull();
    questions[0].querySelector('input[value="0"]').dispatchEvent(new Event('change', { bubbles: true }));
    expect(doc.querySelector('.quiz-results').textContent).toBe('Responses cleared.');
  });
  it.each(['teacher-release', 'teacher-graded'])('keeps %s exports without self-check feedback or answer keys', timing => {
    const { doc } = render(quiz({ deliverySettings: { feedbackTiming: timing } }));
    expect(doc.querySelector('.alloflow-quiz-feedback')).toBeNull();
    expect(doc.querySelector('.quiz-check-btn')).toBeNull();
    expect(doc.querySelector('.question').getAttribute('data-correct')).toBe('');
  });
});
describe('Assessment authoring keyboard focus', () => {
  it('moves focus to Customize questions when Reset removes itself', async () => {
    const noop = () => {};
    function Harness() {
      const [mode, setMode] = React.useState('exit-ticket'), [count, setCount] = React.useState(3), [mix, setMix] = React.useState(null), [reflections, setReflections] = React.useState(1);
      return React.createElement(window.AlloModules.QuizPanel, {
        t: () => '', InfoTooltip: () => null, expandedTools: ['quiz'], history: [], isProcessing: false,
        hasSourceOrAnalysis: true, handleGenerate: noop, quizMode: mode, setQuizMode: setMode,
        quizMcqCount: count, setQuizMcqCount: setCount, quizItemTypeMix: mix, setQuizItemTypeMix: setMix,
        quizReflectionCount: reflections, setQuizReflectionCount: setReflections, quizCustomInstructions: '',
        setQuizCustomInstructions: noop, setDokLevel: noop, setImageStyle: noop, mcqVisualMode: 'none', setMcqVisualMode: noop
      });
    }
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Harness)));
    const duration = host.querySelector('#quiz-duration-preset');
    await act(async () => { duration.value = 'two'; duration.dispatchEvent(new Event('change', { bubbles: true })); });
    const reset = Array.from(host.querySelectorAll('button')).find(node => node.textContent === 'Reset');
    reset.focus(); expect(document.activeElement).toBe(reset);
    await act(async () => reset.click());
    expect(reset.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('[data-help-key="quiz_item_mix_toggle"]'));
    expect(duration.value).toBe('recommended');
  });
});
