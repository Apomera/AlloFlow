import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

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
  // The Memory Aid export branch reads verification, alt-text, and cue rules
  // from window.AlloModules.MemoryAid.exportRules (one derivation shared with
  // the live view) and fails safe without it, so load the module as the app does.
  global.React = window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule('memory_aid_module.js');
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

function makeMemoryAidRecallExport() {
  return {
    id: 'memory-aid-recall-export',
    type: 'memory-aid',
    title: 'Remember Matter',
    data: {
      instructions: 'Use the cue before checking the facts.',
      reflectionLevel: 'quick',
      reasoningRequired: false,
      sourceExcerpt: 'PRIVATE RECALL SOURCE EXCERPT',
      cards: [{
        target: 'States of matter',
        essentialFacts: ['PRIVATE CHECKED FACT: Solids retain shape.'],
        factVerified: true,
        type: 'analogy-pattern',
        mode: 'generated',
        aiExample: 'PRIVATE AI MODEL ANSWER',
        mapping: 'PRIVATE CUE MAPPING',
        studentDraft: 'A statue stays shaped; a guest fits the room.',
        studentReasoning: 'PRIVATE STUDENT REASONING',
        visualImage: 'data:image/png;base64,AAAA',
        visualSource: 'uploaded',
        visualAlt: 'A gray statue stands beside a clear glass container.',
        visualCheck: {
          alignment: 'supports',
          strength: 'PRIVATE VISUAL CHECK',
          concern: 'None identified',
          suggestedChange: 'No change suggested',
        },
        visualReview: { status: 'approved', note: 'PRIVATE TEACHER VISUAL NOTE' },
        feedback: {
          strength: 'PRIVATE FEEDBACK STRENGTH',
          accuracyCheck: 'PRIVATE FEEDBACK ACCURACY',
          nextStep: 'PRIVATE FEEDBACK NEXT STEP',
        },
        practiceAttempts: [{
          id: 'PRIVATE PRACTICE ID',
          response: 'PRIVATE RECALL RESPONSE',
          confidence: 'confident',
          facts: ['PRIVATE SNAPSHOT FACT'],
          factChecks: ['recalled'],
          basisKey: 'PRIVATE BASIS KEY',
          createdAt: 'PRIVATE PRACTICE TIMESTAMP',
        }],
      }, {
        target: 'Visual-only target',
        essentialFacts: ['PRIVATE SECOND CHECKED FACT'],
        factVerified: true,
        type: 'visual-association',
        mode: 'student-authored',
        visualImage: 'data:image/png;base64,BBBB',
        visualSource: 'ai-generated',
        visualAlt: 'Visual memory cue for the visual-only target.',
        retrievalAttempts: [{
          response: 'PRIVATE LEGACY RECALL RESPONSE',
          facts: ['PRIVATE LEGACY SNAPSHOT FACT'],
          factChecks: ['practice'],
          createdAt: 'PRIVATE LEGACY TIMESTAMP',
        }],
      }],
    },
  };
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

  it('preserves the full Memory Aid reference in standard HTML without leaking source or practice history', () => {
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
          factVerified: true,
          type: 'analogy-pattern',
          mode: 'generated',
          aiExample: 'A statue stays shaped; a guest fits the room.',
          mapping: 'Statue = solid; guest = liquid.',
          studentPrompt: 'Make this comparison your own.',
          studentDraft: 'My cue',
          visualImage: 'data:image/png;base64,AAAA',
          visualSource: 'uploaded',
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
          practiceAttempts: [{
            id: 'PRIVATE PRACTICE ID',
            response: 'PRIVATE RECALL RESPONSE',
            confidence: 'confident',
            facts: ['PRIVATE SNAPSHOT FACT'],
            factChecks: ['recalled'],
            basisKey: 'PRIVATE BASIS KEY',
            createdAt: 'PRIVATE PRACTICE TIMESTAMP',
          }],
        }, {
          target: 'Unsafe visual must be omitted',
          essentialFacts: ['The text worksheet must remain usable.'],
          factVerified: false,
          type: 'visual-association',
          mode: 'student-authored',
          visualImage: 'javascript:alert(1)',
          visualAlt: 'This image should not be exported.',
          studentDraft: '',
        }],
      },
    };
    const html = pipeline.generateFullPackHTML([memoryAid], 'Memory export', false, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.memory-aid-export');
    expect(section).not.toBeNull();
    expect(section.textContent).toContain('Solids retain shape.');
    expect(section.textContent).toContain('Teacher-verified facts');
    expect(section.textContent).toContain('Facts awaiting teacher review');
    expect(section.textContent).toContain('Do not use this card for recall practice until a teacher verifies the facts.');
    expect(section.textContent).toContain('A statue stays shaped');
    expect(section.textContent).toContain('My cue');
    expect(section.textContent).toContain('The contrast is clear.');
    expect(section.textContent).toContain('(optional)');
    const images = section.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(images[0].getAttribute('alt')).toBe('Statue & container cue');
    expect(section.textContent).toContain('Source: Uploaded visual');
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
    expect(html).not.toContain('PRIVATE RECALL RESPONSE');
    expect(html).not.toContain('PRIVATE SNAPSHOT FACT');
    expect(html).not.toContain('PRIVATE PRACTICE ID');
    expect(html).not.toContain('PRIVATE BASIS KEY');
    expect(html).not.toContain('PRIVATE PRACTICE TIMESTAMP');
  });

  it('renders an answer-free, accessible cue-first Memory Aid student worksheet', () => {
    const html = pipeline.generateFullPackHTML([makeMemoryAidRecallExport()], 'Memory recall', true, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.memory-aid-export');
    const sheets = Array.from(section.querySelectorAll('.memory-aid-recall-sheet'));

    expect(sheets).toHaveLength(2);
    expect(doc.querySelector('.teacher-view')).toBeNull();
    expect(sheets[0].textContent).toContain('Recall practice · facts hidden');
    expect(sheets[0].textContent).toContain('A statue stays shaped; a guest fits the room.');
    expect(sheets[0].textContent).toContain('What does the cue help you remember?');
    expect(sheets[0].querySelector('.alloflow-ruled-response[data-allo-print-lines="6"]')).not.toBeNull();
    expect(sheets[0].querySelector('fieldset legend')?.textContent).toBe('How confident do you feel before checking?');
    expect(sheets[0].querySelectorAll('.alloflow-print-bubble')).toHaveLength(3);
    expect(sheets[0].textContent).toContain('Not sure yet');
    expect(sheets[0].textContent).toContain('Somewhat confident');
    expect(sheets[0].textContent).toContain('Confident');

    for (const sheet of sheets) {
      const titleId = sheet.getAttribute('aria-labelledby');
      const responseGroup = sheet.querySelector('[role="group"][aria-labelledby]');
      expect(titleId).toBeTruthy();
      expect(doc.getElementById(titleId)).not.toBeNull();
      expect(responseGroup).not.toBeNull();
      expect(doc.getElementById(responseGroup.getAttribute('aria-labelledby'))).not.toBeNull();
    }

    const images = section.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('alt')).toBe('A gray statue stands beside a clear glass container.');
    expect(sheets[1].querySelector('img')).toBeNull();
    expect(sheets[1].textContent).toContain('Visual cue omitted');
    expect(sheets[1].textContent).toContain('No accessible recall cue is available yet.');

    for (const privateValue of [
      'PRIVATE CHECKED FACT', 'PRIVATE SECOND CHECKED FACT', 'PRIVATE AI MODEL ANSWER',
      'PRIVATE CUE MAPPING', 'PRIVATE STUDENT REASONING', 'PRIVATE VISUAL CHECK',
      'PRIVATE TEACHER VISUAL NOTE', 'PRIVATE FEEDBACK STRENGTH', 'PRIVATE FEEDBACK ACCURACY',
      'PRIVATE FEEDBACK NEXT STEP', 'PRIVATE RECALL SOURCE EXCERPT', 'PRIVATE PRACTICE ID',
      'PRIVATE RECALL RESPONSE', 'PRIVATE SNAPSHOT FACT', 'PRIVATE BASIS KEY',
      'PRIVATE PRACTICE TIMESTAMP', 'PRIVATE LEGACY RECALL RESPONSE',
      'PRIVATE LEGACY SNAPSHOT FACT', 'PRIVATE LEGACY TIMESTAMP',
    ]) {
      expect(html).not.toContain(privateValue);
    }
  });

  it('keeps unverified cards authorable but never exports them as recall practice', () => {
    const memoryAid = makeMemoryAidRecallExport();
    memoryAid.data.cards[0].factVerified = false;
    memoryAid.data.cards[0].studentPrompt = 'Revise the statue comparison in your own words.';
    const html = pipeline.generateFullPackHTML([memoryAid], 'Memory review gate', true, {}, {
      includeTeacherKey: false,
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.memory-aid-export');
    const pending = section.querySelector('.memory-aid-review-pending');
    const recallSheets = Array.from(section.querySelectorAll('.memory-aid-recall-sheet'));

    expect(pending).not.toBeNull();
    expect(pending.textContent).toContain('Authoring only · facts awaiting teacher review');
    expect(pending.textContent).toContain('Recall practice is unavailable');
    expect(pending.textContent).toContain('A statue stays shaped; a guest fits the room.');
    expect(pending.textContent).toContain('Revise the statue comparison in your own words.');
    expect(pending.textContent).not.toContain('PRIVATE CHECKED FACT');
    expect(pending.querySelector('[data-allo-print-lines="6"]')).not.toBeNull();
    expect(pending.querySelector('fieldset')).toBeNull();
    expect(pending.textContent).not.toContain('What does the cue help you remember?');
    expect(recallSheets).toHaveLength(1);
    expect(recallSheets[0].textContent).toContain('Visual-only target');
  });

  it('places the full Memory Aid reference only in the optional teacher appendix', () => {
    const html = pipeline.generateFullPackHTML([makeMemoryAidRecallExport()], 'Memory recall', true, {}, {
      includeTeacherKey: true,
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sections = Array.from(doc.querySelectorAll('.memory-aid-export'));
    const teacherView = doc.querySelector('.teacher-view');

    expect(sections).toHaveLength(2);
    expect(teacherView).not.toBeNull();
    expect(sections[0].querySelectorAll('.memory-aid-recall-sheet')).toHaveLength(2);
    expect(sections[0].textContent).not.toContain('PRIVATE CHECKED FACT');
    expect(sections[0].textContent).not.toContain('PRIVATE AI MODEL ANSWER');
    expect(sections[0].textContent).not.toContain('PRIVATE CUE MAPPING');
    expect(sections[0].textContent).not.toContain('PRIVATE FEEDBACK STRENGTH');

    const teacherSection = teacherView.querySelector('.memory-aid-export');
    expect(teacherSection.querySelector('.memory-aid-recall-sheet')).toBeNull();
    expect(teacherSection.textContent).toContain('PRIVATE CHECKED FACT: Solids retain shape.');
    expect(teacherSection.textContent).toContain('PRIVATE SECOND CHECKED FACT');
    expect(teacherSection.textContent).toContain('PRIVATE AI MODEL ANSWER');
    expect(teacherSection.textContent).toContain('PRIVATE CUE MAPPING');
    expect(teacherSection.textContent).toContain('PRIVATE STUDENT REASONING');
    expect(teacherSection.textContent).toContain('PRIVATE FEEDBACK STRENGTH');
    expect(html.indexOf('PRIVATE CHECKED FACT')).toBeGreaterThan(html.indexOf('class="teacher-view"'));

    for (const privateAttemptValue of [
      'PRIVATE PRACTICE ID', 'PRIVATE RECALL RESPONSE', 'PRIVATE SNAPSHOT FACT',
      'PRIVATE BASIS KEY', 'PRIVATE PRACTICE TIMESTAMP', 'PRIVATE LEGACY RECALL RESPONSE',
      'PRIVATE LEGACY SNAPSHOT FACT', 'PRIVATE LEGACY TIMESTAMP',
    ]) {
      expect(html).not.toContain(privateAttemptValue);
    }
    expect(html).not.toContain('PRIVATE RECALL SOURCE EXCERPT');
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
