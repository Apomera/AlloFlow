import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

let pipeline;

const quizItem = {
  id: 'mixed-quiz',
  type: 'quiz',
  title: 'Mixed assessment',
  data: {
    questions: [
      { type: 'mcq', question: 'Choose one.', options: ['A', 'B'], correctAnswer: 'A' },
      { type: 'multi-select', question: 'Choose both.', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'] },
      { type: 'fill-blank', question: 'Complete the sentence.', expectedFill: 'word' },
      { type: 'short-answer', question: 'Answer briefly.', expectedAnswer: 'A brief answer.' },
      { type: 'self-explanation', question: 'Explain your reasoning.', rubric: 'Connect the evidence and claim.' },
      { type: 'sequence-sense', question: 'Check the order.', items: ['First', 'Second', 'Third'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0, orderingPrinciple: 'chronological' },
      { type: 'relation-mismatch', question: 'Find the mismatch.', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '9' }], wrongPairIndex: 1, candidatePartners: ['2', '9'], correctPartnerForWrong: '2' },
      { type: 'answer-evidence', question: 'Choose and support.', answerOptions: ['Yes', 'No'], correctAnswer: 'Yes', evidencePrompt: 'Best evidence?', evidenceOptions: ['Data', 'Guess'], correctEvidence: 'Data' },
      { type: 'numeric-response', question: 'Measure it.', correctValue: 10, tolerance: 0.5, unit: 'cm', acceptableUnits: ['centimeters'] },
    ],
    reflections: [{ prompt: 'What strategy helped?' }],
  },
};

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub,
    callGeminiVision: stub,
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
});

function render(isWorksheet, extraConfig = {}) {
  return pipeline.generateFullPackHTML([quizItem], 'Mixed assessment', isWorksheet, {}, {
    includeTeacherKey: false,
    annotations: [],
    ...extraConfig,
  });
}

describe('quiz parity across HTML and printable worksheet exports', () => {
  it('renders every supported item type as a usable, labeled HTML response', () => {
    const html = render(false);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const quiz = doc.querySelector('.quiz-box');

    expect(quiz).not.toBeNull();
    expect(quiz.querySelectorAll('.question')).toHaveLength(9);
    for (const type of ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response']) {
      expect(quiz.querySelector(`[data-item-type="${type}"]`)).not.toBeNull();
    }
    expect(quiz.querySelectorAll('[data-item-type="multi-select"] input[type="checkbox"]')).toHaveLength(3);
    expect(quiz.querySelector('[data-allo-response-key="mixed-quiz:q7:answer"]')).not.toBeNull();
    expect(quiz.querySelector('[data-allo-response-key="mixed-quiz:q7:evidence"]')).not.toBeNull();
    expect(quiz.querySelector('input[data-allo-response-key="mixed-quiz:q8:number"][type="number"]')).not.toBeNull();
    expect(quiz.querySelector('input[data-allo-response-key="mixed-quiz:q8:unit"]')).not.toBeNull();
    expect(quiz.querySelector('select[data-allo-response-key="mixed-quiz:q5:sequence-principle"]')).not.toBeNull();
    expect(Array.from(quiz.querySelectorAll('[data-item-type="sequence-sense"] input[type="radio"]')).map((node) => node.value)).toEqual(['yes', 'no']);
    expect(quiz.querySelector('table caption')?.textContent).toContain('Pairs to review');
    expect(quiz.querySelectorAll('table th')).toHaveLength(2);
    expect(html).toContain('const _collectNamedResponses');
    expect(html).toContain('_responsePayloadKey(key)');
  });

  it('runs the shared autosave contract for grouped and compound responses', async () => {
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => {
      const message = String(error?.stack || error?.message || error || '');
      if (/SyntaxError|Uncaught/i.test(message)) runtimeErrors.push(message);
    });
    const dom = new JSDOM(render(false), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/mixed-export.html',
      virtualConsole,
    });
    await new Promise((resolve) => {
      if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
      else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
    });
    const doc = dom.window.document;
    const multi = doc.querySelectorAll('[data-allo-response-key="mixed-quiz:q1:multi"]');
    multi[0].click();
    multi[2].click();
    doc.querySelectorAll('[data-allo-response-key="mixed-quiz:q7:answer"]')[1].click();
    doc.querySelectorAll('[data-allo-response-key="mixed-quiz:q7:evidence"]')[0].click();
    const number = doc.querySelector('[data-allo-response-key="mixed-quiz:q8:number"]');
    const unit = doc.querySelector('[data-allo-response-key="mixed-quiz:q8:unit"]');
    number.value = '12.5';
    unit.value = 'cm';
    number.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    unit.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 350));

    const stored = Array.from({ length: dom.window.localStorage.length }, (_, index) => {
      const key = dom.window.localStorage.key(index);
      return [key, dom.window.localStorage.getItem(key)];
    }).filter(([key]) => key.startsWith('allo-response:'));
    const storedValues = stored.map(([, value]) => value);
    expect(runtimeErrors).toEqual([]);
    expect(storedValues).toEqual(expect.arrayContaining(['["0","2"]', '1', '0', '12.5', 'cm']));
    expect(Array.from({ length: dom.window.localStorage.length }, (_, index) => dom.window.localStorage.key(index)).some((key) => key.startsWith('allo-ta:') || key.startsWith('allo-bx:'))).toBe(false);
  });

  it('builds a neutral response manifest without answer-key data', async () => {
    const dom = new JSDOM(render(false), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/manifest-export.html',
    });
    await new Promise((resolve) => {
      if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
      else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
    });
    const contract = dom.window.__alloflowSubmissionResponseContract;
    const manifest = contract.collectManifest();
    const byKey = Object.fromEntries(manifest.entries.map((entry) => [entry.key, entry]));

    expect(manifest.schemaVersion).toBe(1);
    expect(byKey['allo-response:mixed-quiz:q0:mcq']).toMatchObject({
      question: 'Choose one.', responseType: 'mcq', partLabel: 'Answer', manualReview: true,
      valueLabels: { 0: 'A', 1: 'B' },
    });
    expect(byKey['allo-response:mixed-quiz:q3:short']).toMatchObject({ responseType: 'short-answer', manualReview: false });
    expect(byKey['allo-response:mixed-quiz:q7:evidence']).toMatchObject({ partLabel: 'Evidence', manualReview: true });
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain('A brief answer.');
    expect(serialized).not.toContain('Connect the evidence and claim.');
    expect(serialized).not.toContain('correctAnswer');
    expect(serialized).not.toContain('data-correct');
  });

  it('uses the same bounded collision-detected key for responses and manifest rows', async () => {
    const longId = 'quiz-' + 'x'.repeat(260);
    const longQuiz = { ...quizItem, id: longId, data: { ...quizItem.data, questions: [quizItem.data.questions[0]] } };
    const html = pipeline.generateFullPackHTML([longQuiz], 'Long key assessment', false, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/long-key.html' });
    await new Promise((resolve) => {
      if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
      else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
    });
    dom.window.document.querySelector('[data-allo-response-key]')?.click();
    const contract = dom.window.__alloflowSubmissionResponseContract;
    const responseKeys = Object.keys(contract.collectNamedResponses());
    const manifestKeys = contract.collectManifest().entries.map((entry) => entry.key);

    expect(responseKeys).toHaveLength(1);
    expect(manifestKeys).toContain(responseKeys[0]);
    expect(responseKeys[0].length).toBeLessThanOrEqual(224);
    expect(responseKeys[0]).toMatch(/:[a-z0-9]+$/);
  });

  it('disambiguates response keys that normalize to the same readable base', async () => {
    const shortQuestion = [{ type: 'short-answer', question: 'Explain.', expectedAnswer: 'Teacher only.' }];
    const quizzes = [
      { ...quizItem, id: 'space-key', data: { questions: shortQuestion, reflections: [] } },
      { ...quizItem, id: ' space-key', data: { questions: shortQuestion, reflections: [] } },
    ];
    const dom = new JSDOM(pipeline.generateFullPackHTML(quizzes, 'Collision check', false, {}, {
      includeTeacherKey: false,
      annotations: [],
    }), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/collision-key.html' });
    await new Promise((resolve) => {
      if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
      else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
    });
    const controls = dom.window.document.querySelectorAll('textarea[data-allo-response-key]');
    expect(controls).toHaveLength(2);
    controls[0].value = 'First response';
    controls[1].value = 'Second response';
    const contract = dom.window.__alloflowSubmissionResponseContract;
    const responseKeys = Object.keys(contract.collectNamedResponses());
    const manifestKeys = contract.collectManifest().entries.map((entry) => entry.key);

    expect(new Set(responseKeys).size).toBe(2);
    expect(new Set(manifestKeys).size).toBe(2);
    expect(manifestKeys).toEqual(expect.arrayContaining(responseKeys));
  });

  it('replaces all live quiz controls with clear paper response affordances', () => {
    const doc = new DOMParser().parseFromString(render(true), 'text/html');
    const quiz = doc.querySelector('.quiz-box');
    const questions = Array.from(quiz.querySelectorAll('.question'));

    expect(questions).toHaveLength(9);
    expect(quiz.querySelectorAll('input,textarea,select')).toHaveLength(0);
    expect(questions.every((question) => question.querySelector('[data-allo-print-response]'))).toBe(true);
    expect(quiz.querySelector('[data-item-type="fill-blank"] .alloflow-print-blank')).not.toBeNull();
    expect(quiz.querySelectorAll('[data-item-type="multi-select"] .alloflow-print-box')).toHaveLength(3);
    expect(quiz.querySelectorAll('[data-item-type="numeric-response"] .alloflow-print-blank')).toHaveLength(2);
    expect(quiz.querySelectorAll('[data-allo-response-key]')).toHaveLength(0);
  });

  it('includes complete answer guidance in the optional teacher appendix', () => {
    const html = render(true, { includeTeacherKey: true });
    expect(html).toContain('A, C');
    expect(html).toContain('evidence: Data');
    expect(html).toContain('10 ± 0.5 cm / centimeters');
    expect(html).toContain('correct partner: <em>2</em>');
  });
});
