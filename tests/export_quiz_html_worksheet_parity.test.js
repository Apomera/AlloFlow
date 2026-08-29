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
      url: 'https://example.test/mixed-export.html?nickname=TestLearner',
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
    const documentId = doc.querySelector('meta[name="alloflow-document-id"]')?.content;
    expect(documentId).toMatch(/^[a-f0-9]{32}$/);
    expect(dom.window.__alloflowSubmissionResponseContract).toMatchObject({
      storageVersion: 2,
      documentId,
    });
    expect(Array.from({ length: dom.window.localStorage.length }, (_, index) => dom.window.localStorage.key(index)).some((key) => key.startsWith('allo-ta:') || key.startsWith('allo-bx:'))).toBe(false);
  });

  it('gives distinct content and colliding legacy field hashes separate v2 storage identities', async () => {
    const makeQuiz = (id, prompt) => ({
      id,
      type: 'quiz',
      title: 'Identity quiz',
      data: { questions: [{ type: 'short-answer', question: prompt, expectedAnswer: 'Teacher only.' }], reflections: [] },
    });
    const firstIdentityHtml = pipeline.generateFullPackHTML([makeQuiz('identity-quiz', 'Cats?')], 'Stable identity', false, {}, {
      includeTeacherKey: false, annotations: [],
    });
    const sameIdentityHtml = pipeline.generateFullPackHTML([makeQuiz('identity-quiz', 'Cats?')], 'Stable identity', false, {}, {
      includeTeacherKey: false, annotations: [],
    });
    const secondIdentityHtml = pipeline.generateFullPackHTML([makeQuiz('identity-quiz', 'Dogs?')], 'Stable identity', false, {}, {
      includeTeacherKey: false, annotations: [],
    });
    const readId = (html) => new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="alloflow-document-id"]')?.content;
    expect(readId(firstIdentityHtml)).toMatch(/^[a-f0-9]{32}$/);
    expect(readId(sameIdentityHtml)).toBe(readId(firstIdentityHtml));
    expect(readId(secondIdentityHtml)).not.toBe(readId(firstIdentityHtml));

    // "Aa:q0:short" and "BB:q0:short" collide under the v1 Java-style
    // 32-bit hash. V2 stores the exact encoded response key instead.
    const collisionHtml = pipeline.generateFullPackHTML([
      makeQuiz('Aa', 'First response?'),
      makeQuiz('BB', 'Second response?'),
    ], 'Legacy hash collision', false, {}, { includeTeacherKey: false, annotations: [] });
    const createRuntime = (stored = []) => new JSDOM(collisionHtml, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/v2-collision.html?nickname=TestLearner',
      beforeParse(win) { stored.forEach(([key, value]) => win.localStorage.setItem(key, value)); },
    });
    const wait = (dom) => new Promise((resolve) => {
      if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
      else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
    });
    const first = createRuntime();
    await wait(first);
    const controls = first.window.document.querySelectorAll('textarea[data-allo-response-key]');
    controls[0].value = 'Alpha';
    controls[1].value = 'Beta';
    controls.forEach((control) => control.dispatchEvent(new first.window.Event('input', { bubbles: true })));
    await new Promise((resolve) => first.window.setTimeout(resolve, 350));
    const keys = Array.from({ length: first.window.localStorage.length }, (_, index) => first.window.localStorage.key(index));
    const aaKey = keys.find((key) => key.includes('named:Aa%3Aq0%3Ashort'));
    const bbKey = keys.find((key) => key.includes('named:BB%3Aq0%3Ashort'));
    expect(aaKey).toBeTruthy();
    expect(bbKey).toBeTruthy();
    expect(aaKey).not.toBe(bbKey);
    expect(first.window.localStorage.getItem(aaKey)).toBe('Alpha');
    expect(first.window.localStorage.getItem(bbKey)).toBe('Beta');

    // A v2 empty string is a tombstone: a stale v1 answer must not reappear.
    const legacyHash = (value) => {
      let hash = 0;
      for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
      return Math.abs(hash).toString(36);
    };
    const legacyDocKey = (first.window.document.title || 'doc').slice(0, 40) + '|' + first.window.document.body.textContent.length + '|u:TestLearner';
    first.window.localStorage.setItem('allo-response:' + legacyDocKey + ':' + legacyHash('Aa:q0:short'), 'Stale v1 value');
    controls[0].value = '';
    controls[0].dispatchEvent(new first.window.Event('input', { bubbles: true }));
    await new Promise((resolve) => first.window.setTimeout(resolve, 350));
    expect(first.window.localStorage.getItem(aaKey)).toBe('');
    const snapshot = Array.from({ length: first.window.localStorage.length }, (_, index) => {
      const key = first.window.localStorage.key(index);
      return [key, first.window.localStorage.getItem(key)];
    });
    first.window.close();

    const restored = createRuntime(snapshot);
    await wait(restored);
    const restoredControls = restored.window.document.querySelectorAll('textarea[data-allo-response-key]');
    expect(restoredControls[0].value).toBe('');
    expect(restoredControls[1].value).toBe('Beta');
    restored.window.close();
  });

  it('collects legacy answers from the live page immediately and flushes them on pagehide', async () => {
    const legacyItems = [
      { id: 'legacy-list', type: 'sentence-frames', title: 'List frame', data: { mode: 'list', items: [{ text: 'I noticed...' }] } },
      { id: 'legacy-blank', type: 'sentence-frames', title: 'Blank frame', data: { mode: 'paragraph', text: 'The result is [blank].' } },
    ];
    const html = pipeline.generateFullPackHTML(legacyItems, 'Legacy response check', false, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/legacy-responses.html?nickname=TestLearner',
    });
    await new Promise((resolve) => {
      if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
      else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
    });
    const textarea = dom.window.document.querySelector('.interactive-textarea');
    const blank = dom.window.document.querySelector('.interactive-blank');
    textarea.value = 'Immediate textarea answer';
    blank.value = 'Immediate blank answer';
    const contract = dom.window.__alloflowSubmissionResponseContract;
    const immediate = Object.values(contract.collectAllResponses());
    expect(immediate).toEqual(expect.arrayContaining(['Immediate textarea answer', 'Immediate blank answer']));

    textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 450));
    textarea.value = '';
    expect(Object.values(contract.collectAllResponses())).not.toContain('Immediate textarea answer');

    textarea.value = 'Close-safe textarea';
    blank.value = 'Close-safe blank';
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    const savedValues = Array.from({ length: dom.window.localStorage.length }, (_, index) => {
      const key = dom.window.localStorage.key(index);
      return dom.window.localStorage.getItem(key);
    });
    expect(savedValues).toEqual(expect.arrayContaining(['Close-safe textarea', 'Close-safe blank']));
    dom.window.close();
  });

  it('keeps anchor charts offline unless web fonts are explicitly enabled', () => {
    const anchor = {
      id: 'anchor-offline',
      type: 'anchor-chart',
      title: 'Key idea',
      data: { chartType: 'reference', sections: [{ label: 'Remember', bullets: ['A useful detail'] }] },
    };
    const offline = pipeline.generateFullPackHTML([anchor], 'Offline anchor', false, {}, {
      includeTeacherKey: false,
      annotations: [],
      readerWebFonts: false,
    });
    const online = pipeline.generateFullPackHTML([anchor], 'Online anchor', false, {}, {
      includeTeacherKey: false,
      annotations: [],
      readerWebFonts: true,
    });
    expect(offline).not.toContain('family=Permanent+Marker');
    expect(online).toContain('family=Permanent+Marker');
  });

  it('exports Memory Aid Studio as a fact-grounded worksheet without leaking its source excerpt', () => {
    const memoryAid = {
      id: 'memory-aid-export',
      type: 'memory-aid',
      title: 'Remember Matter',
      data: {
        instructions: 'Create a cue, then explain the connection.',
        reflectionLevel: 'quick',
        reasoningRequired: false,
        sourceExcerpt: 'PRIVATE SOURCE EXCERPT SHOULD NOT APPEAR',
        cards: [{
          target: 'States <script>alert(1)</script>',
          essentialFacts: ['Solids retain shape.', 'Liquids take the container shape.'],
          type: 'analogy-pattern',
          mode: 'generated',
          aiExample: 'A statue stays shaped; a guest fits the room.',
          mapping: 'Statue = solid; guest = liquid.',
          studentPrompt: 'Make this comparison your own.',
          studentDraft: 'My cue',
          visualImage: 'data:image/png;base64,AAAA',
          visualAlt: 'Statue & container cue',
          visualReview: {
            status: 'approved',
            note: 'The cue matches <facts> after teacher review.',
          },
          visualCheck: {
            alignment: 'supports',
            strength: 'The statue and container are visible.',
            concern: 'Gas is not represented.',
            suggestedChange: 'Add a subtle balloon.',
          },
          reasoningPrompt: 'How does each image cue the fact?',
          studentReasoning: 'The two images contrast shape behavior.',
          feedback: {
            strength: 'The contrast is clear.',
            accuracyCheck: 'Both facts remain aligned.',
            nextStep: 'Add a cue for gases.',
            question: 'What will you remember first?',
          },
        }, {
          target: 'Unsafe visual must be omitted',
          essentialFacts: ['The text worksheet must remain usable.'],
          type: 'visual-association',
          mode: 'student-authored',
          visualImage: 'javascript:alert(1)',
          visualAlt: 'This image should not be exported.',
          studentDraft: '',
        }],
      },
    };
    const html = pipeline.generateFullPackHTML([memoryAid], 'Memory export', true, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.memory-aid-export');
    expect(section).not.toBeNull();
    expect(section.textContent).toContain('Solids retain shape.');
    expect(section.textContent).toContain('A statue stays shaped');
    expect(section.textContent).toContain('My cue');
    expect(section.textContent).toContain('The contrast is clear.');
    expect(section.textContent).toContain('(optional)');
    const images = section.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(images[0].getAttribute('alt')).toBe('Statue & container cue');
    expect(section.textContent).toContain('Image description: Statue & container cue');
    expect(section.textContent).toContain('Teacher approved');
    expect(section.textContent).toContain('The cue matches <facts> after teacher review.');
    expect(section.textContent).toContain('AI visual check (advisory)');
    expect(section.textContent).toContain('Gas is not represented.');
    expect(section.textContent).toContain('This feedback does not replace teacher approval.');
    expect(html).toContain('The cue matches &lt;facts&gt; after teacher review.');
    expect(html).toContain('States &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('PRIVATE SOURCE EXCERPT SHOULD NOT APPEAR');
  });

  it('exports Applied Challenge Studio as a persistent workspace without leaking its source excerpt', () => {
    const challenge = {
      id: 'applied-challenge-export-test',
      type: 'applied-challenge',
      title: 'Water Access Decision',
      data: {
        family: 'decide',
        instructions: 'Use lesson evidence, name assumptions, and revise after testing.',
        fitReason: 'The lesson presents a consequential choice with competing constraints.',
        sourceExcerpt: 'PRIVATE APPLIED CHALLENGE SOURCE SHOULD NOT APPEAR',
        brief: {
          context: 'A town must improve reliable access to clean water.',
          drivingQuestion: 'Which option best balances access, cost, and environmental impact?',
          lockedLessonFacts: ['Gravity moves water <script>alert(1)</script> downhill.'],
          openQuestions: ['What maintenance capacity is available?'],
          criteria: ['Uses lesson evidence', 'Addresses a meaningful tradeoff'],
          constraints: ['Do not invent prices or local findings.'],
          deliverable: 'A recommendation with evidence and a revision note.',
          evidenceBoundary: 'Treat costs and adoption rates as assumptions unless sourced.',
          factVerified: false,
        },
        supports: {
          parallelExample: { context: 'Choosing a school garden location', move: 'Compare access and upkeep.' },
          frameStarter: 'Option ___ is stronger because ___; however, ___.',
        },
        workspace: {
          workingQuestion: 'How can the town improve access without overstating certainty?',
          stakeholders: 'Residents, maintenance staff, and nearby ecosystems.',
          possibilities: 'Gravity-fed storage or a pumped distribution extension.',
          evidence: 'Gravity can reduce pumping needs where elevation permits.',
          assumptions: 'The terrain and maintenance capacity require verification.',
          tradeoffs: 'Lower energy use may require a less convenient location.',
          response: 'Start with a terrain and maintenance feasibility study.',
          testReflection: 'The first draft treated available land as certain.',
          revision: 'Label the land assumption and add a site-verification step.',
          transferReflection: 'The same evidence-versus-assumption check applies to transit plans.',
        },
        feedback: {
          strength: 'The recommendation clearly separates evidence from assumptions.',
          lessonConnectionCheck: 'The gravity claim stays connected to the lesson.',
          evidenceOrConstraintCheck: 'Local terrain remains appropriately unresolved.',
          nextStep: 'Define what evidence would confirm maintenance feasibility.',
          status: 'needs-check',
        },
      },
    };
    const html = pipeline.generateFullPackHTML([challenge], 'Applied challenge export', true, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.applied-challenge-export');
    expect(section).not.toBeNull();
    expect(section.textContent).toContain('Gravity moves water');
    expect(section.textContent).toContain('Lesson facts awaiting teacher review');
    expect(section.textContent).toContain('Label the land assumption');
    expect(section.textContent).toContain('The same evidence-versus-assumption check');
    expect(section.textContent).toContain('clearly separates evidence from assumptions');
    expect(section.textContent).toContain('Fact check needed');
    expect(html).toContain('Gravity moves water &lt;script&gt;alert(1)&lt;/script&gt; downhill.');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('PRIVATE APPLIED CHALLENGE SOURCE SHOULD NOT APPEAR');
    const manifestEntry = pipeline.interactiveObjectManifestItem(challenge, { renderedInIms: true });
    expect(manifestEntry).not.toHaveProperty('data');
    expect(JSON.stringify(manifestEntry)).not.toContain('PRIVATE APPLIED CHALLENGE SOURCE SHOULD NOT APPEAR');
  });

  it('builds a neutral response manifest without answer-key data', async () => {
    const dom = new JSDOM(render(false), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/manifest-export.html?nickname=TestLearner',
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
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/long-key.html?nickname=TestLearner' });
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
    }), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/collision-key.html?nickname=TestLearner' });
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
  it('exports Applied Challenge Studio as a persistent workspace without leaking its source excerpt', () => {
    const challenge = {
      id: 'applied-challenge-export-test',
      type: 'applied-challenge',
      title: 'Water Access Decision',
      data: {
        family: 'decide',
        instructions: 'Use lesson evidence, name assumptions, and revise after testing.',
        fitReason: 'The lesson presents a consequential choice with competing constraints.',
        sourceExcerpt: 'PRIVATE APPLIED CHALLENGE SOURCE SHOULD NOT APPEAR',
        brief: {
          context: 'A town must improve reliable access to clean water.',
          drivingQuestion: 'Which option best balances access, cost, and environmental impact?',
          lockedLessonFacts: ['Gravity moves water <script>alert(1)</script> downhill.'],
          openQuestions: ['What maintenance capacity is available?'],
          criteria: ['Uses lesson evidence', 'Addresses a meaningful tradeoff'],
          constraints: ['Do not invent prices or local findings.'],
          deliverable: 'A recommendation with evidence and a revision note.',
          evidenceBoundary: 'Treat costs and adoption rates as assumptions unless sourced.',
          factVerified: false,
        },
        supports: {
          parallelExample: { context: 'Choosing a school garden location', move: 'Compare access and upkeep.' },
          frameStarter: 'Option ___ is stronger because ___; however, ___.',
        },
        workspace: {
          workingQuestion: 'How can the town improve access without overstating certainty?',
          stakeholders: 'Residents, maintenance staff, and nearby ecosystems.',
          possibilities: 'Gravity-fed storage or a pumped distribution extension.',
          evidence: 'Gravity can reduce pumping needs where elevation permits.',
          assumptions: 'The terrain and maintenance capacity require verification.',
          tradeoffs: 'Lower energy use may require a less convenient location.',
          response: 'Start with a terrain and maintenance feasibility study.',
          testReflection: 'The first draft treated available land as certain.',
          revision: 'Label the land assumption and add a site-verification step.',
          transferReflection: 'The same evidence-versus-assumption check applies to transit plans.',
        },
        feedback: {
          strength: 'The recommendation clearly separates evidence from assumptions.',
          lessonConnectionCheck: 'The gravity claim stays connected to the lesson.',
          evidenceOrConstraintCheck: 'Local terrain remains appropriately unresolved.',
          nextStep: 'Define what evidence would confirm maintenance feasibility.',
          status: 'needs-check',
        },
      },
    };
    const html = pipeline.generateFullPackHTML([challenge], 'Applied challenge export', true, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.applied-challenge-export');
    expect(section).not.toBeNull();
    expect(section.textContent).toContain('Gravity moves water');
    expect(section.textContent).toContain('Lesson facts awaiting teacher review');
    expect(section.textContent).toContain('Label the land assumption');
    expect(section.textContent).toContain('The same evidence-versus-assumption check');
    expect(section.textContent).toContain('clearly separates evidence from assumptions');
    expect(section.textContent).toContain('Fact check needed');
    expect(html).toContain('Gravity moves water &lt;script&gt;alert(1)&lt;/script&gt; downhill.');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('PRIVATE APPLIED CHALLENGE SOURCE SHOULD NOT APPEAR');
    const manifestEntry = pipeline.interactiveObjectManifestItem(challenge, { renderedInIms: true });
    expect(manifestEntry).not.toHaveProperty('data');
    expect(JSON.stringify(manifestEntry)).not.toContain('PRIVATE APPLIED CHALLENGE SOURCE SHOULD NOT APPEAR');
  });
});
