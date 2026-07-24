import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const root = process.cwd();
const panelSource = () => readFileSync(resolve(root, 'view_sidebar_panels_source.jsx'), 'utf8');
const dispatcherSource = () => readFileSync(resolve(root, 'generate_dispatcher_source.jsx'), 'utf8');
const quizSource = () => readFileSync(resolve(root, 'view_quiz_source.jsx'), 'utf8');
const appSource = () => readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');

let strategies;
let aggregators;
beforeAll(() => {
  loadAlloModule('quiz_mode_strategies.js');
  strategies = window.AlloModules.QuizModeStrategies;
  loadAlloModule('quiz_live_aggregators.js');
  aggregators = window.AlloModules.QuizLiveAggregators;
});

describe('quiz modes as customizable presets', () => {
  it('defines the recommended mixes and reflection defaults', () => {
    expect(strategies.getStrategy('exit-ticket').generation).toMatchObject({
      defaultItemTypeMix: { mcq: 3, 'fill-blank': 1, 'short-answer': 1 },
      defaultReflectionCount: 1,
    });
    expect(strategies.getStrategy('pre-check').generation.defaultItemTypeMix).toEqual({
      mcq: 2, 'multi-select': 1, 'fill-blank': 1, 'relation-mismatch': 1,
    });
    expect(strategies.getStrategy('formative').generation.defaultItemTypeMix).toEqual({ mcq: 1, 'multi-select': 1 });
    expect(strategies.getStrategy('review').generation.defaultItemTypeMix).toEqual({
      mcq: 2,
      'fill-blank': 1,
      'short-answer': 1,
      'self-explanation': 2,
      'sequence-sense': 1,
    });
  });

  it('allows every scored item type to be selected in every exposed mode', () => {
    const expected = ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'];
    for (const mode of ['exit-ticket', 'pre-check', 'formative', 'review']) {
      expect(strategies.getStrategy(mode).generation.allowedItemTypes).toEqual(expected);
    }
  });

  it('passes exact custom counts, including zero, from the panel to generation', () => {
    const source = panelSource();
    expect(source).toContain('min="0"');
    expect(source).toContain('quizMcqCount: clampCount(effectiveMix.mcq || 0, 20)');
    expect(source).toContain('quizReflectionCount: reflectionTotal');
    expect(source).toContain('itemTypes: effectiveMix');
    expect(source).toContain('handleModeChange(event.target.value)');
    expect(source).toContain("{isCustomized ? 'Customized' : 'Recommended preset'}");
    expect(source).toContain('Closing reflection');
    expect(source).not.toContain("{quizMode === 'exit-ticket' && (");
    expect(dispatcherSource()).toContain('const _includeReflections = _reflectionCount > 0;');
    expect(dispatcherSource()).toContain('const _reflectionInstruction = _includeReflections');
  });

  it('separates unscored reflections and groups scored formats by evidence', () => {
    const source = panelSource();
    expect(source).toContain('Customize questions');
    expect(source).toContain('Closing reflection');
    expect(source).toContain('(unscored)');
    expect(source).toContain('max="2"');
    expect(source).toContain("label: 'Core formats'");
    expect(source).toContain("label: 'Diagnostic formats'");
    expect(source).toContain("label: 'Brief Written Response'");
    expect(source).toContain("label: 'Explain Your Reasoning'");
  });

  it('defines schemas and exact-count support for the new deterministic formats', () => {
    const source = dispatcherSource();
    for (const type of ['multi-select', 'answer-evidence', 'numeric-response']) {
      expect(source).toContain(`'${type}'`);
    }
    expect(source).toContain('correctAnswers');
    expect(source).toContain('answerOptions');
    expect(source).toContain('evidenceOptions');
    expect(source).toContain('correctValue');
    expect(source).toContain('tolerance');
  });

  it('reports structured deterministic scores to live dashboards', () => {
    for (const type of ['multi-select', 'answer-evidence', 'numeric-response']) {
      expect(aggregators.gradeResponseForItem({
        itemType: type,
        answer: { status: 'partially-correct', score: 50 },
      }, { type })).toMatchObject({ status: 'partially-correct', score: 50 });
    }
  });

  it('treats explicit counts as authoritative and keeps local generation type-aware', () => {
    const source = dispatcherSource();
    expect(source).toContain('Object.prototype.hasOwnProperty.call(configOverride, key)');
    expect(source).toContain('if (_explicitMcqCount > 0) _modeItemMix.mcq = _explicitMcqCount;');
    expect(source).toContain('else delete _modeItemMix.mcq;');
    expect(source).toMatch(/Generate exactly .*_resolvedItemCount.* assessed items using this exact item-type recipe:/);
    expect(source).not.toContain('const localQuizCount = Math.max(3');
    expect(source).toContain('const _jsonExampleQuestions = _supportedItemTypes.filter');
    expect(source).toContain('content.itemCountMismatch = _countMismatch');
  });

  it('uses a purpose-first unified builder with time guidance and reusable presets', () => {
    const source = panelSource();
    expect(source.indexOf('1. Assessment purpose')).toBeLessThan(source.indexOf('2. Customize questions'));
    expect(source).toContain("{ key: 'mcq', label: 'Multiple Choice'");
    expect(source).toContain('No format is treated as an “extra.”');
    expect(source).toContain('estimatedLow');
    expect(source).toContain('estimatedHigh');
    expect(source).toContain('ASSESSMENT_PRESET_STORAGE_KEY');
    expect(source).toContain('persistAssessmentPresets');
  });

  it('persists explicit scoring policy and supports teacher-reviewed writing', () => {
    const panel = panelSource();
    const dispatcher = dispatcherSource();
    const quiz = quizSource();
    expect(panel).toContain('scoringPolicy,');
    expect(panel).toContain('Allow partial credit');
    expect(panel).toContain('Submit for teacher review');
    expect(dispatcher).toContain('content.scoringPolicy = Object.assign({}, _scoringPolicy)');
    expect(quiz).toContain("writtenResponseMode === 'teacher-review'");
    expect(quiz).toContain("p.scoringPolicy.partialCredit !== false");
  });

  it('provides full-format author controls and accessible voice dictation', () => {
    const quiz = quizSource();
    const app = appSource();
    expect(quiz).toContain('function AssessmentItemEditor');
    expect(quiz).toContain('function AssessmentCoreFields');
    expect(quiz).toContain('function AssessmentDiagnosticFields');
    expect(quiz).toContain('Regenerate item');
    expect(quiz).toContain('Dictate response');
    expect(quiz).toContain('window.SpeechRecognition || window.webkitSpeechRecognition');
    expect(app).toContain('const handleQuizQuestionAction');
    for (const action of ['patch', 'delete', 'duplicate', 'move', 'replace-all', 'append']) {
      expect(app).toContain("action === '" + action + "'");
    }
  });

  it('uses one permission-aware dictation service for written, numeric, and reflection responses', () => {
    const quiz = quizSource();
    const app = appSource();
    expect(quiz).toContain('voice.createDictationController');
    expect(quiz).toContain('props.studentProjectSettings.allowDictation === false');
    expect(quiz).toContain('Dictate written response');
    expect(quiz).toContain('Dictate number or units');
    expect(quiz.match(/Dictate reflection/g)?.length).toBeGreaterThanOrEqual(2);
    expect(app).toContain('window.AlloFlowVoice');
    expect(app).toContain('dictationStatus={dictationStatus}');
    expect(app).toContain('target.isContentEditable');
  });

  it('renders every supported question type on the presentation board', () => {
    const quiz = quizSource();
    expect(quiz).toContain('function AssessmentPresentationItem');
    expect(quiz).toContain('data-presentation-question-type={type}');
    expect(quiz).toContain('Reveal answer guide');
    expect(quiz).toContain('Correct selections:');
    expect(quiz).toContain('Expected fill:');
    expect(quiz).toContain('Correct order:');
    expect(quiz).toContain('Fix the mismatch:');
    expect(quiz).toContain('Part 1 - answer options');
    expect(quiz).toContain('Expected value:');
    expect(quiz).not.toContain("if (!q || (q.type && q.type !== 'mcq') || !Array.isArray(q.options)) return null;");
  });
  it('shows a persistent structural quality review with one-click repair', () => {
    const quiz = quizSource();
    expect(quiz).toContain('function _quizAuditAssessment');
    expect(quiz).toContain('function AssessmentQualityPanel');
    expect(quiz).toContain('Requested vs generated');
    expect(quiz).toContain('Fix flagged and missing items');
    expect(quiz).toContain('async function repairAssessmentQuality');
    expect(quiz).toContain('async function regenerateAssessmentQuestion');
  });
  it('keeps rebuilt quiz modules identical to deployed copies', () => {
    for (const name of ['view_sidebar_panels_module.js', 'generate_dispatcher_module.js', 'quiz_mode_strategies.js']) {
      expect(readFileSync(resolve(root, 'desktop/web-app/public', name), 'utf8'))
        .toBe(readFileSync(resolve(root, name), 'utf8'));
    }
  });
});
