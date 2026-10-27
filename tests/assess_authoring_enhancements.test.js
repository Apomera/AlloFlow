import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let api, root, host;
const sources = [
  { id: 'old-a', type: 'analysis', title: 'Plants last week', data: { originalText: 'Plants need light and water to grow.', concepts: ['plant needs', 'light'] } },
  { id: 'today', type: 'analysis', title: 'Current lesson', data: { originalText: 'A different current lesson.', concepts: ['today'] } },
  { id: 'old-b', type: 'analysis', title: 'Earlier fractions', data: { originalText: 'One half equals two quarters.', concepts: ['equivalent fractions'] } }
];
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = {};
  loadAlloModule('quiz_mode_strategies.js'); api = window.AlloModules.QuizModeStrategies;
  loadAlloModule('view_sidebar_panels_module.js');
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('live_aac_module.js');
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });

describe('Assess authoring choices', () => {
  it('keeps the existing recommended recipe and supplies bounded short recipes', () => {
    expect(api.durationRecipe('review', 'recommended').itemTypes).toEqual(api.getStrategy('review').generation.defaultItemTypeMix);
    expect(api.durationRecipe('exit-ticket', 'two')).toEqual({ itemTypes: { mcq: 1, 'fill-blank': 1 }, reflectionCount: 0 });
    const recipe = api.durationRecipe('exit-ticket', 'recommended'); recipe.itemTypes.mcq = 99;
    expect(api.getStrategy('exit-ticket').generation.defaultItemTypeMix.mcq).toBe(3);
  });
  it('uses only explicitly selected available earlier source identities and concepts', () => {
    const context = api.resolveReviewContext(sources, ['old-b', 'missing'], ['equivalent fractions', 'today']);
    expect(context.sourceIds).toEqual(['old-b']);
    expect(context.concepts).toEqual(['equivalent fractions']);
    expect(context.sources[0].text).toBe('One half equals two quarters.');
    expect(context.fallback).toBe(false);
    expect(api.resolveReviewContext(sources, ['missing'], null)).toMatchObject({ sources: [], fallback: true });
    expect(api.resolveReviewContext(sources, [], null)).toMatchObject({ sources: [], fallback: true });
  });
  it('samples criteria without expanding the question count and reports uncovered criteria honestly', () => {
    const criteria = [1, 2, 3, 4].map(n => ({ id: 'SC' + n, statement: 'Criterion ' + n }));
    const auto = api.resolveCriteriaCoverage(criteria, null, 2, [{ criterionId: 'SC1' }, { criterionId: 'SC2' }]);
    expect(auto.selectedIds).toEqual(['SC1', 'SC2']);
    expect(auto.coveredIds).toEqual(['SC1', 'SC2']);
    expect(auto.uncoveredIds).toEqual(['SC3', 'SC4']);
    expect(api.resolveCriteriaCoverage(criteria, ['SC4', 'bogus'], 2, []).selectedIds).toEqual(['SC4']);
    expect(api.resolveCriteriaCoverage(criteria, [], 2, []).selectedIds).toEqual([]);
  });
  it('normalizes policy choices with safe backward-compatible defaults', () => {
    expect(api.normalizeAssessmentOptions({ numericSettings: { valueWeight: 5 }, fillBlankPolicy: 'other' })).toMatchObject({ fillBlankPolicy: 'normalized', sequenceMode: 'diagnostic', numericSettings: { valueWeight: 1, allowEquivalentUnits: false } });
    expect(api.normalizeAssessmentOptions({})).toMatchObject({ numericSettings: { valueWeight: 0.5 }, sequenceMaxSteps: 6 });
  });
  it('applies a time preset through the real builder and sends the exact recipe', async () => {
    const generate = vi.fn();
    function Harness() {
      const [mode, setMode] = React.useState('exit-ticket'), [count, setCount] = React.useState(3), [mix, setMix] = React.useState(null), [reflections, setReflections] = React.useState(1);
      return React.createElement(window.AlloModules.QuizPanel, {
        t: () => '', InfoTooltip: () => null, expandedTools: ['quiz'], history: sources, isProcessing: false,
        hasSourceOrAnalysis: true, handleGenerate: generate, quizMode: mode, setQuizMode: setMode,
        quizMcqCount: count, setQuizMcqCount: setCount, quizItemTypeMix: mix, setQuizItemTypeMix: setMix,
        quizReflectionCount: reflections, setQuizReflectionCount: setReflections, quizCustomInstructions: '',
        setQuizCustomInstructions: vi.fn(), setDokLevel: vi.fn(), setImageStyle: vi.fn(), mcqVisualMode: 'none', setMcqVisualMode: vi.fn()
      });
    }
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Harness)));
    const duration = host.querySelector('#quiz-duration-preset');
    await act(async () => { duration.value = 'two'; duration.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => host.querySelector('[data-help-key="quiz_generate_button"]').click());
    expect(generate.mock.calls[0][4]).toMatchObject({ itemTypes: { mcq: 1, 'fill-blank': 1 }, quizReflectionCount: 0, assessmentOptions: { fillBlankPolicy: 'normalized' } });
    const mode = host.querySelector('#quiz-mode-select');
    await act(async () => { mode.value = 'review'; mode.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('No earlier lesson selected');
    const source = [...host.querySelectorAll('label')].find(label => label.textContent.includes('Earlier fractions')).querySelector('input');
    await act(async () => source.click());
    await act(async () => host.querySelector('[data-help-key="quiz_generate_button"]').click());
    expect(generate.mock.calls.at(-1)[4].reviewSourceIds).toEqual(['old-b']);
    expect(host.textContent).not.toContain('No earlier lesson selected');
  });
});

describe('Local content review remains advisory and private', () => {
  it('checks quotations across all formats without claiming semantic verification', () => {
    const types = api.getStrategy('exit-ticket').generation.allowedItemTypes;
    const questions = types.map(type => ({ type, question: 'A question', sourceEvidence: 'Plants need light and water.' }));
    const result = api.localContentReview(questions, 'Plants need light and water. This is the source.');
    expect(result).toMatchObject({ status: 'teacher-review-required', method: 'local-checks' });
    expect(result.items).toHaveLength(9);
    for (const item of result.items) { expect(item.status).toBe('review'); expect(item.checklist.length).toBeGreaterThan(0); }
    expect(api.localContentReview([{ type: 'mcq', sourceEvidence: 'An invented quotation.' }], 'Actual source').items[0]).toMatchObject({ status: 'unclear', evidenceQuote: '' });
    expect(api.contentReviewSignature({ type: 'numeric-response', correctValue: 2 })).not.toBe(api.contentReviewSignature({ type: 'numeric-response', correctValue: 3 }));
  });
  it.each(['teacher-graded', 'teacher-release', 'immediate'])('keeps source evidence and review notes out of %s student transports', timing => {
    const resource = { id: 'assessment', type: 'quiz', data: {
      deliverySettings: { feedbackTiming: timing }, contentReview: { items: [{ reason: 'PRIVATE_REVIEW' }] },
      questions: [{ type: 'short-answer', question: 'Explain.', expectedAnswer: 'PRIVATE_KEY', sourceEvidence: 'PRIVATE_EVIDENCE', studentCriteria: ['Explain the relationship.'] }]
    } };
    const session = window.prepareSessionResourcesForWrite([resource], { maxBytes: 20000 }).resources[0];
    const packed = window.AlloModules.LiveAac.serializeResourceForStudentPack(resource, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
    for (const output of [session, packed]) {
      expect(JSON.stringify(output)).not.toContain('PRIVATE_REVIEW');
      expect(JSON.stringify(output)).not.toContain('PRIVATE_EVIDENCE');
      if (timing !== 'immediate') expect(JSON.stringify(output)).not.toContain('PRIVATE_KEY');
      expect(output.data.questions[0].studentCriteria).toEqual(['Explain the relationship.']);
    }
    expect(resource.data.contentReview.items[0].reason).toBe('PRIVATE_REVIEW');
  });
});
