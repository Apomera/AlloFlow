import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
let aggregators, audit, normalizeGeneratedNumeric, createExport, exportPreflight;

beforeAll(() => {
  const fakeWindow = { AlloModules: {} };
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(fakeWindow);
  aggregators = fakeWindow.AlloModules.QuizLiveAggregators;
  const compiled = babel.transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  const helpers = new Function('React', 'window', compiled + '\nreturn { audit: _quizAuditAssessment };')({}, fakeWindow);
  audit = helpers.audit;
  const dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');
  const start = dispatcher.indexOf("                    const hasCorrectValue =");
  const end = dispatcher.indexOf('\n                }', start);
  if (start < 0 || end < 0) throw new Error('Numeric normalization branch not found');
  normalizeGeneratedNumeric = new Function('q', 'const base = {};\n' + dispatcher.slice(start, end) + '\nreturn base;');
  const exportCode = babel.transformSync(readFileSync('export_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  createExport = new Function('window', exportCode + '\nreturn createExport;')(window);
  const previewSource = readFileSync('view_export_preview_source.jsx', 'utf8');
  exportPreflight = new Function(previewSource.slice(previewSource.indexOf('function _builderH5PCompatibility'), previewSource.indexOf('function _builderEditorPageCss')) + '\nreturn _builderH5PCompatibility;')();
});

afterEach(() => vi.restoreAllMocks());

function fixture(question, answer, scoringPolicy = {}) {
  return {
    state: { allResponses: { learner: { 0: { itemType: question.type, answer } } } },
    content: { data: { questions: [question], scoringPolicy } },
    roster: { learner: { displayName: 'Learner' } },
  };
}
function gradebook(f, cache, overrides) {
  return aggregators.aggregateGradebook(f.state, f.content, f.roster, cache, overrides).studentRows[0];
}

describe('Assess uses the same partial-credit policy throughout teacher results', () => {
  const cases = [
    [{ type: 'multi-select', options: ['A', 'B', 'C', 'D', 'E'], correctAnswers: ['A', 'B', 'C', 'D'] }, { selectedIndices: [0] }, 0.25],
    [{ type: 'numeric-response', correctValue: 10, unit: 'cm', tolerance: 0 }, { numericValue: 10, unit: 'm' }, 0.5],
    [{ type: 'answer-evidence', answerOptions: ['A', 'B'], correctAnswer: 'A', evidenceOptions: ['E1', 'E2'], correctEvidence: 'E1' }, { answerIdx: 0, evidenceIdx: 1 }, 0.5],
    [{ type: 'sequence-sense', items: ['Seed', 'Seedling', 'Plant'], presentedOrder: [0, 1, 2], orderingPrinciple: 'chronological', principleOptions: ['chronological', 'size'] }, { verifyAnswer: 'yes', orderAnswer: [0, 1, 2], principleAnswer: 'size' }, 0.75],
  ];

  it.each(cases)('preserves actual credit for $0.type and propagates all-or-nothing policy', (question, answer, fraction) => {
    for (const partialCredit of [true, false]) {
      const f = fixture(question, answer, { partialCredit });
      const expected = partialCredit ? fraction : 0;
      const expectedStatus = partialCredit ? 'partially-correct' : 'incorrect';
      expect(aggregators.gradeResponseForItem(f.state.allResponses.learner[0], question, { partialCredit }).status).toBe(expectedStatus);
      const row = gradebook(f);
      expect(row).toMatchObject({ totalEarned: expected, totalPossible: 1, scorePercent: expected * 100, totalCorrect: 0 });
      expect(row.byQuestion[0]).toMatchObject({ status: expectedStatus, scoreFraction: expected, earnedPoints: expected, maxPoints: 1 });
      expect(aggregators.aggregateItemAnalysis(f.state, f.content, f.roster).items[0].correctRate).toBe(expected * 100);
      expect(aggregators.aggregatePreLessonGap(f.state, f.content, f.roster).conceptCards[0].scorePercent).toBe(expected * 100);
      expect(aggregators.aggregateLiveHeatmap(f.state, f.content, f.roster).bars[0].scorePercent).toBe(expected * 100);
      expect(aggregators.buildPrivacySafeQuizEvidenceSnapshot(f.state, f.content, f.roster).items[0].correctRate).toBe(expected * 100);
    }
  });

  it('keeps an AI partial judgment partial, with bounded credit and teacher override precedence', () => {
    const f = fixture({ type: 'short-answer', question: 'How do roots help plants?', expectedAnswer: 'Absorb water and anchor the plant.' }, { text: 'They hold the plant in place.' });
    const cache = { 'learner:0': { status: 'partially-correct', score: 60, feedback: 'Also describe water absorption.' } };
    expect(gradebook(f, cache)).toMatchObject({ totalCorrect: 0, totalPartial: 1, totalEarned: 0.6, totalPossible: 1, scorePercent: 60 });
    expect(gradebook(f, cache).byQuestion[0].status).toBe('partially-correct');
    const responseFingerprint = aggregators.assessmentResponseFingerprint(f.content.data.questions[0], f.state.allResponses.learner[0]);
    expect(gradebook(f, cache, { learner: { 0: { status: 'correct', responseFingerprint } } })).toMatchObject({ totalCorrect: 1, totalEarned: 1, scorePercent: 100 });
    f.content.data.scoringPolicy.partialCredit = false;
    expect(gradebook(f, cache)).toMatchObject({ totalCorrect: 0, totalEarned: 0, scorePercent: 0 });
    f.content.data.scoringPolicy.writtenResponseMode = 'teacher-review';
    expect(gradebook(f, cache)).toMatchObject({ totalPossible: 0, totalEarned: 0, scorePercent: null });
    expect(gradebook(f, cache).byQuestion[0].status).toBe('submitted');
  });

  it('does not penalize IDK, pending review, or unscored polls, while preserving participation', () => {
    const questions = [
      { type: 'mcq', options: ['A', 'B'], correctAnswer: 'A' },
      { type: 'mcq', options: ['A', 'B'], correctAnswer: 'A' },
      { type: 'short-answer' },
      { type: 'opinion-mcq', options: ['A', 'B'] },
    ];
    const f = { state: { allResponses: { learner: {
      0: { answer: { optionIdx: 0 } }, 1: { answer: { idk: true } },
      2: { answer: { text: 'Review me', status: 'correct', score: 100 } }, 3: { answer: { optionIdx: 0 } },
    } } }, content: { data: { questions } }, roster: {} };
    expect(gradebook(f)).toMatchObject({ totalAnswered: 4, totalCorrect: 1, totalIdk: 1, totalUnscored: 1, totalEarned: 1, totalPossible: 1, scorePercent: 100 });
    expect(gradebook(f).byQuestion.slice(1).map(g => g.maxPoints)).toEqual([0, 0, 0]);
  });
});

describe('Assess readiness rejects unanswered keys and impossible choice sets', () => {
  const numeric = value => ({ type: 'numeric-response', question: 'How many sides?', correctValue: value, tolerance: 0, conceptLabel: 'shape sides' });

  it.each(['', '  ', null, undefined, false, [], {}, 'not a number', Infinity])('rejects a missing or invalid numeric key %j in authoring, generation, and runtime grading', value => {
    expect(audit({ questions: [numeric(value)] }).ready).toBe(false);
    expect(normalizeGeneratedNumeric(numeric(value)).correctValue).toBeNull();
    expect(aggregators.presentationQuestionIsGameScorable(numeric(value))).toBe(false);
    expect(aggregators.gradePresentationResponse({ answer: { numericValue: 0 } }, numeric(value))).toMatchObject({ status: 'submitted', evaluable: false });
    expect(gradebook(fixture(numeric(value), { numericValue: 0 }))).toMatchObject({ totalPossible: 0, scorePercent: null });
  });

  it.each([0, '0', -1, '2.5'])('keeps legitimate numeric keys including zero: %j', value => {
    expect(audit({ questions: [numeric(value)] }).ready).toBe(true);
    expect(normalizeGeneratedNumeric(numeric(value)).correctValue).toBe(Number(value));
    expect(aggregators.gradePresentationResponse({ answer: { numericValue: Number(value) } }, numeric(value)).status).toBe('correct');
  });

  it('requires a selectable ordering principle and distinct nonempty steps/choices', () => {
    const question = { type: 'sequence-sense', question: 'Order plant growth.', conceptLabel: 'growth', items: ['Seed', 'Seedling', 'Plant'], presentedOrder: [0, 1, 2], orderingPrinciple: 'growth', principleOptions: ['chronological', 'size'] };
    expect(audit({ questions: [question] }).issues.some(issue => issue.code === 'sequence-principle-key')).toBe(true);
    question.principleOptions = ['growth', 'size'];
    expect(audit({ questions: [question] }).ready).toBe(true);
    expect(audit({ questions: [{ ...question, orderingPrinciple: 'chronological', principleOptions: undefined }] }).ready).toBe(true);
    question.items[1] = ' ';
    expect(audit({ questions: [question] }).ready).toBe(false);
    question.items[1] = 'Seed';
    expect(audit({ questions: [question] }).issues.some(issue => issue.code === 'sequence-duplicate-items')).toBe(true);
  });

  it('rejects empty relation pairs and unselectable repairs', () => {
    const question = { type: 'relation-mismatch', question: 'Repair the pair.', conceptLabel: 'pairs', pairs: [{ left: 'Root', right: 'Water' }, { left: 'Leaf', right: 'Stone' }, { left: 'Stem', right: 'Support' }], wrongPairIndex: 1, correctPartnerForWrong: 'Light', candidatePartners: ['Light', 'Stone'] };
    expect(audit({ questions: [question] }).ready).toBe(true);
    question.pairs[0].left = '';
    question.candidatePartners = ['Stone'];
    const result = audit({ questions: [question] });
    expect(result.ready).toBe(false);
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['relation-empty-pairs', 'relation-candidates', 'relation-partner-options']));
  });
});

describe('Assess numeric exports never manufacture a zero answer key', () => {
  it.each(['QTI', 'H5P'])('omits malformed numeric items from %s while preserving authored zero', async format => {
    let zip;
    window.JSZip = class {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); return this; }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:numeric-export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const api = createExport({
      liveRef: { current: { sourceTopic: 'Numbers', addToast, t: key => key } },
      warnLog: vi.fn(), debugLog: vi.fn(), generateUUID: () => '12345678-1234-1234-1234-123456789abc',
      escapeXml: value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    });
    const invalid = ['', '  ', null, undefined, false, [], {}, 'not a number'];
    const questions = invalid.map((value, index) => ({ type: 'numeric-response', question: 'Invalid numeric key ' + index, correctValue: value, tolerance: 0 }));
    questions.push({ type: 'numeric-response', question: 'Authored zero', correctValue: 0, tolerance: 0 });
    const generatedContent = { type: 'quiz', title: 'Numeric keys', data: { questions } };
    expect(exportPreflight(generatedContent)).toMatchObject({ valid: 1, omitted: invalid.length, ready: true });
    await api['handleExport' + format]({ generatedContent });
    const content = zip.files.get(format === 'QTI' ? 'assessment.xml' : 'content/content.json');
    expect(content).toContain('Authored zero');
    expect(content).not.toContain('Invalid numeric key');
    if (format === 'QTI') expect(content).toMatch(/<varequal respident="NUM_8">0<\/varequal>/);
    else expect(content).toContain('*0*');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining(String(invalid.length)), 'warning');
    expect(zip.generateAsync).toHaveBeenCalledOnce();
  });
});
