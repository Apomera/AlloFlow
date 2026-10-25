import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { transformSync } = require('@babel/core');
const { act } = React;
const t = (key, options) => options?.defaultValue || key;
let api, root, host, serial = 0;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {};
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  const code = transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] }, compact: false,
  }).code;
  api = new Function('window', 'React', code + `\nreturn {
    QuizView, namespace: _quizDraftNamespace, oldNamespace: _quizPreviousDraftNamespace,
    previousData: _quizPreviousStableAssessmentData, signature: _quizFeedbackSignature,
    oldSignature: _quizPreviousFeedbackSignature, compatible: _quizCompatibleFeedbackSignatures,
    prepare: _quizPrepareDraft, mergeIdentity: _quizMergeDraftIdentity, receiptKey: _quizAttemptStorageKey,
    receipt: _quizReadAttemptReceipt, working: _quizReadWorkingDraft, stage: _quizStageDraftField
  };`)(window, React);
}, 120000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  localStorage.clear(); vi.restoreAllMocks();
});

function props() {
  return {
    t, isTeacherMode: false, isParentMode: false, isIndependentMode: false,
    user: { uid: 'identity-learner' }, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false,
    escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    generatedContent: { id: 'metadata-' + (++serial), type: 'quiz', data: {
      title: 'Plant check', questions: [{ type: 'short-answer', question: 'Explain how roots help.', expectedAnswer: 'They absorb water.', question_en: 'An English gloss' }],
      deliverySettings: { feedbackTiming: 'after-submit' },
    } },
    formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 1,
    playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(),
    ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null,
  };
}
function metadataEdit(p) {
  const next = structuredClone(p.generatedContent);
  Object.assign(next.data.questions[0], { conceptLabel: 'roots', explanation: 'Roots anchor the plant.', factCheck: 'The reference answer is still correct.', keyCheck: { status: 'confirmed', checkedAt: Date.now() } });
  return { ...p, generatedContent: next };
}
async function render(p) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(api.QuizView, p)));
}
async function unmount() { await act(async () => root.unmount()); host.remove(); root = host = null; }
const button = label => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === label);
async function click(label) { const element = button(label); expect(element, label).toBeTruthy(); await act(async () => element.click()); }
async function fill(value) {
  await act(async () => {
    const input = host.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function fixture(p, version = 'stripped') {
  const data = p.generatedContent.data, suffix = ':user-' + p.user.uid;
  const oldData = version === 'stripped' ? api.previousData(data) : data;
  const namespace = api.namespace(data, null, p.generatedContent.id) + suffix;
  const oldNamespace = api.oldNamespace(oldData, null, p.generatedContent.id) + suffix;
  const context = api.mergeIdentity(namespace, { resourceId: p.generatedContent.id, sessionCode: '', activityId: '', userId: p.user.uid, signature: api.signature(data), previousSignature: api.oldSignature(data), compatibleSignatures: api.compatible(data) });
  return { namespace, oldNamespace, context, oldSignature: api.oldSignature(oldData), candidates: [
    { namespace: api.oldNamespace(api.previousData(data), null, p.generatedContent.id) + suffix, signature: api.oldSignature(api.previousData(data)) },
    { namespace: api.oldNamespace(data, null, p.generatedContent.id) + suffix, signature: api.oldSignature(data) },
  ] };
}
function draft(response, updatedAt = Date.now()) {
  return { version: 1, createdAt: updatedAt, updatedAt, items: { root: { attemptMeta: { attemptId: 'original-attempt', startedAt: updatedAt } }, 'q-0': { response } } };
}
function receipt(response, signature) {
  return { version: 1, attemptId: 'original-attempt', signature, submittedAt: Date.now(), startedAt: Date.now() - 1000,
    summary: { total: 1, answered: 1, unanswered: [], flagged: [] }, responses: draft(response).items,
    delivery: { status: 'local' }, feedbackTiming: 'teacher-release', sessionCode: '', activityId: '' };
}

describe('assessment identity follows responses, not editorial metadata', () => {
  it('preserves pending active work and its attempt when metadata changes, including after reload', async () => {
    const p = props(); await render(p); await fill('Roots take in water.');
    const field = host.querySelector('textarea'), original = fixture(p);
    const attemptId = api.working(original.namespace).items.root.attemptMeta.attemptId;
    const revised = metadataEdit(p); await render(revised);
    expect(host.querySelector('textarea')).toBe(field);
    expect(field.value).toBe('Roots take in water.');
    expect(api.working(original.namespace).items.root.attemptMeta.attemptId).toBe(attemptId);
    await unmount(); await render(revised);
    expect(host.querySelector('textarea').value).toBe('Roots take in water.');
    expect(host.textContent).not.toContain('earlier version');
  });

  it('preserves a completed attempt and feedback after metadata changes and reload', async () => {
    const p = props(); await render(p); await fill('Roots take in water.');
    await click('Review & submit'); await click('Submit assessment');
    expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    const id = api.receipt(fixture(p).namespace).attemptId;
    const revised = metadataEdit(p); await render(revised); await unmount(); await render(revised);
    expect(api.receipt(fixture(revised).namespace).attemptId).toBe(id);
    expect(host.querySelector('[data-assessment-attempt-feedback]').textContent).toContain('Roots take in water.');
    expect(p.onResourceComplete).toHaveBeenCalledTimes(1);
  });

  it.each(['question', 'expectedAnswer'])('separates saved work when %s actually changes', async field => {
    const p = props(); await render(p); await fill('My original response.'); await unmount();
    const changed = { ...p, generatedContent: structuredClone(p.generatedContent) };
    changed.generatedContent.data.questions[0][field] += ' Changed.';
    await render(changed);
    expect(host.querySelector('textarea').value).toBe('');
    expect(host.textContent).toContain('earlier version');
    await render(p); expect(host.querySelector('textarea').value).toBe('My original response.');
  });

  it('ignores confirmed-key notes and reflection glosses but preserves a live key dispute', () => {
    const original = { questions: [{ type: 'mcq', question: 'Choose a plant.', options: ['Rose', 'Rock'], correctAnswer: 'Rose' }], reflections: [{ text: 'Explain your reasoning.' }] };
    const changed = structuredClone(original);
    Object.assign(changed.questions[0], { conceptLabel: 'plants', explanation: 'Roses are plants.', factCheck: 'The key is correct.', keyCheck: { status: 'confirmed', checkedKey: 'Rose', checkedAt: 123 } });
    changed.reflections[0].text_en = 'Updated gloss';
    expect(api.signature(changed)).toBe(api.signature(original));
    changed.questions[0].keyCheck.status = 'disputed';
    expect(api.signature(changed)).not.toBe(api.signature(original));
    changed.questions[0].keyCheck.checkedKey = 'Old key';
    expect(api.signature(changed)).toBe(api.signature(original));
  });

  it.each([
    ['correctAnswer', 'Rock'], ['options', ['Rock', 'Rose']], ['evidenceOptions', ['New evidence']],
    ['presentedOrder', [1, 0]], ['pairs', [{ left: 'A', right: 'Changed' }]], ['imageUrl', 'new.png'],
    ['correctValue', 8], ['tolerance', 0.5], ['acceptableUnits', ['metres']], ['rubric', { accuracy: { points: 2 } }],
  ])('preserves response-relevant %s changes in both identities', (field, value) => {
    const original = { questions: [{ type: 'mcq', question: 'Choose a plant.', options: ['Rose', 'Rock'], correctAnswer: 'Rose' }] };
    const changed = structuredClone(original); changed.questions[0][field] = value;
    expect(api.namespace(changed, 'class', 'resource')).not.toBe(api.namespace(original, 'class', 'resource'));
    expect(api.signature(changed)).not.toBe(api.signature(original));
  });
});

describe('exact previous-identity migration', () => {
  it.each(['stripped', 'full'])('restores an active %s-fingerprint draft without changing its answers or owner', async version => {
    const p = metadataEdit(props()), f = fixture(p, version);
    localStorage.setItem(f.oldNamespace, JSON.stringify(draft('Previously saved response.')));
    await render(p);
    expect(host.querySelector('textarea').value).toBe('Previously saved response.');
    expect(api.working(f.namespace).items.root.attemptMeta.attemptId).toBe('original-attempt');
    expect(JSON.parse(localStorage.getItem(f.oldNamespace)).items['q-0'].response).toBe('Previously saved response.');
  });

  it.each(['stripped', 'full'])('migrates a completed %s-fingerprint receipt and retains its released feedback through later metadata edits', async version => {
    const p = metadataEdit(props()); p.generatedContent.data.deliverySettings.feedbackTiming = 'teacher-release';
    const f = fixture(p, version);
    p.generatedContent.data.deliverySettings.feedbackReleasedFor = f.oldSignature;
    localStorage.setItem(api.receiptKey(f.oldNamespace), JSON.stringify(receipt('A completed response.', f.oldSignature)));
    await render(p);
    expect(host.querySelector('[data-assessment-attempt-feedback]').textContent).toContain('A completed response.');
    expect(api.receipt(f.namespace).signature).toBe(api.signature(p.generatedContent.data));
    const revised = metadataEdit(p); revised.generatedContent.data.questions[0].explanation += ' More detail.';
    await unmount(); await render(revised);
    expect(host.querySelector('[data-assessment-attempt-feedback]').textContent).toContain('A completed response.');
    expect(api.receipt(f.namespace).attemptId).toBe('original-attempt');
  });

  it.each(['draft', 'receipt', 'pending'])('does not replace newer destination %s work with a legacy candidate', type => {
    const p = metadataEdit(props()), f = fixture(p);
    localStorage.setItem(f.oldNamespace, JSON.stringify(draft('Legacy response.')));
    if (type === 'draft') localStorage.setItem(f.namespace, JSON.stringify(draft('New response.')));
    if (type === 'receipt') localStorage.setItem(api.receiptKey(f.namespace), JSON.stringify(receipt('New response.', f.context.signature)));
    if (type === 'pending') api.stage(f.namespace, 'q-0', 'response', 'New response.');
    api.prepare(f.namespace, f.candidates, f.context);
    const response = type === 'receipt' ? api.receipt(f.namespace).responses['q-0'].response : api.working(f.namespace).items['q-0'].response;
    expect(response).toBe('New response.');
  });

  it('rejects a legacy receipt with another signature and does not adopt another resource or user', () => {
    const p = metadataEdit(props()), f = fixture(p);
    localStorage.setItem(api.receiptKey(f.oldNamespace), JSON.stringify(receipt('Old questions.', 'different-signature')));
    api.prepare(f.namespace, f.candidates, f.context); expect(api.receipt(f.namespace)).toBeNull();
    localStorage.removeItem(api.receiptKey(f.oldNamespace));
    localStorage.setItem(f.oldNamespace, JSON.stringify(draft('Private response.')));
    for (const other of [{ ...p, user: { uid: 'other-user' } }, { ...p, generatedContent: { ...p.generatedContent, id: 'other-resource' } }]) {
      const next = fixture(other); api.prepare(next.namespace, next.candidates, next.context);
      expect(api.working(next.namespace).items['q-0']).toBeUndefined();
    }
  });

  it('does not carry legacy feedback release permission onto changed questions', async () => {
    const p = metadataEdit(props()), f = fixture(p);
    localStorage.setItem(api.receiptKey(f.oldNamespace), JSON.stringify(receipt('Old response.', f.oldSignature)));
    p.generatedContent.data.deliverySettings = { feedbackTiming: 'teacher-release', feedbackReleasedFor: f.oldSignature };
    await render(p); expect(host.querySelector('[data-assessment-attempt-feedback]')).toBeTruthy();
    const changed = { ...p, generatedContent: structuredClone(p.generatedContent) };
    changed.generatedContent.data.questions[0].expectedAnswer = 'A different reference answer.';
    // teacher-release work is identified without the key (fix1025 A2), so the
    // submitted attempt stays; the release made for the old key must not.
    await render(changed);
    expect(host.querySelector('[data-assessment-submitted]')).toBeTruthy();
    expect(host.querySelector('[data-assessment-attempt-feedback]')).toBeNull();
    expect(host.querySelector('[data-assessment-feedback-waiting]')).toBeTruthy();
  });
});
