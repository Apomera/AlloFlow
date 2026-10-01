// 2026-09-27 lesson plan fixes: success criteria find their class results in
// either generation order (C1), only from the right quiz and never from a
// pre-check (C2), reach print/HTML/copy (C3), and headings follow the saved
// guide type (C4); the STEAM "Open tool" button loads the tool it names (C5).
// FIX0927_LP_DIR points the module loads at another build (mutation checks).
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const require = createRequire(import.meta.url);
const DIR = process.env.FIX0927_LP_DIR || process.cwd();
const load = (file, dir = DIR) => new Function(readFileSync(join(dir, file), 'utf8') + '\n//# sourceURL=' + file)();
let React, createRoot, act, root, host, View, U, Q, EH;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.React = React;
  load('quiz_live_aggregators.js', process.cwd());
  for (const f of ['utils_pure_module.js', 'view_lesson_plan_module.js', 'export_handlers_module.js']) load(f);
  View = window.AlloModules.LessonPlanView; U = window.AlloModules.UtilsPure; Q = window.AlloModules.QuizLiveAggregators; EH = window.AlloModules.ExportHandlers;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; delete window.__alloCriterionRollup; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function renderPlan(plan, extra = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const reteach = [];
  act(() => root.render(React.createElement(View, {
    generatedContent: plan, history: [], isTeacherMode: true, isEditingLessonPlan: false, t: () => '', getRows: () => 2,
    handleLessonPlanChange: () => {}, handleActivateNextLesson: (...args) => reteach.push(args),
    BilingualFieldRenderer: ({ text }) => React.createElement('span', null, text), ...extra
  })));
  return reteach;
}
const chips = () => [...host.querySelectorAll('[data-criterion-mastery]')];
function rollupFor(questions, wrongFor = {}, meta = {}) {
  const quiz = { id: meta.quizId || 'quiz-1', type: 'quiz', data: { questions } };
  const answer = (q, right) => ({ itemType: 'mcq', conceptLabel: Q.normalizeConceptId(q.conceptLabel), answer: { optionIdx: right ? 0 : 1 } });
  const allResponses = {};
  ['u1', 'u2'].forEach(uid => { allResponses[uid] = {}; questions.forEach((q, i) => { allResponses[uid][i] = answer(q, !(wrongFor[uid] || []).includes(i)); }); });
  const out = Q.aggregateSuccessCriteria({ allResponses }, quiz, null);
  return { byConcept: out.byConcept, respondents: out.respondents, quizId: quiz.id, quizTitle: 'Plants exit ticket', quizMode: 'exit-ticket', sessionCode: 'ABC', sessionLabel: 'live session ABC', ...meta };
}
const mcq = (label, i) => ({ type: 'mcq', question: 'Q' + i, options: ['a', 'b'], correctAnswer: 'a', conceptLabel: label });

describe('C1: criteria written before the quiz find their class results', () => {
  it('plan first: model ids that are not already lowercase still show % met for every criterion', () => {
    const model = [
      { id: 'SC1', statement: 'I can explain how plants make food.' },
      { id: 'Photosynthesis Inputs', statement: 'I can name the inputs of photosynthesis.' },
      { id: 'the-water-cycle', statement: 'I can describe the water cycle.' },
      { statement: 'I can compare producers and consumers.' }
    ];
    const criteria = U.normalizeSuccessCriteria(model, { concepts: [], objectives: [] });
    // The quiz is told to copy each id exactly; the dispatcher then applies normalizeConceptId.
    const questions = criteria.map((c, i) => mcq(Q.normalizeConceptId(c.id), i));
    window.__alloCriterionRollup = rollupFor(questions);
    renderPlan({ id: 'plan-1', type: 'lesson-plan', data: { successCriteria: criteria } });
    expect(chips()).toHaveLength(4);
    expect(chips().every(node => /100% met \(2\/2\)/.test(node.textContent))).toBe(true);
  });

  it('a plan saved before the fix (raw ids) still finds results rolled up under lowercased labels', () => {
    const criteria = [{ id: 'SC1', statement: 'I can explain how plants make food.', source: 'objective' }, { id: 'Photosynthesis Inputs', statement: 'I can name the inputs.', source: 'objective' }];
    window.__alloCriterionRollup = rollupFor([mcq('sc1', 0), mcq('photosynthesis inputs', 1)]);
    renderPlan({ id: 'plan-legacy', type: 'lesson-plan', data: { successCriteria: criteria } });
    expect(chips().map(node => node.getAttribute('data-criterion-mastery'))).toEqual(['SC1', 'Photosynthesis Inputs']);
  });

  it('quiz first: an older quiz with capitalised labels still lines up with answers stamped in normalised form', () => {
    const quiz = { id: 'quiz-old', type: 'quiz', data: { questions: [mcq('Tides', 0), mcq('Moon Phases', 1)] } };
    const criteria = U.normalizeSuccessCriteria([{ id: 'Tides', statement: 'I can explain tides.' }], { concepts: U.getQuizConceptLabels(quiz) });
    window.__alloCriterionRollup = rollupFor(quiz.data.questions, {}, { quizId: 'quiz-old' });
    renderPlan({ id: 'plan-2', type: 'lesson-plan', data: { successCriteria: criteria, successCriteriaQuizId: 'quiz-old' } });
    expect(chips()).toHaveLength(2);
  });

  it('the plan view applies the same key and quiz rules before UtilsPure has loaded', () => {
    const utils = window.AlloModules.UtilsPure; delete window.AlloModules.UtilsPure;
    try {
      window.__alloCriterionRollup = rollupFor([mcq('sc1', 0), mcq('photosynthesis inputs', 1)], {}, { quizId: 'quiz-9' });
      renderPlan({ id: 'plan-f', type: 'lesson-plan', data: { successCriteria: [{ id: 'SC1', statement: 'A' }, { id: 'Photosynthesis Inputs', statement: 'B' }] } });
      expect(chips()).toHaveLength(2);
      act(() => root.unmount()); root = null; host.remove();
      renderPlan({ id: 'plan-g', type: 'lesson-plan', data: { successCriteriaQuizId: 'quiz-1', successCriteria: [{ id: 'SC1', statement: 'A' }] } });
      expect(chips()).toHaveLength(0);
    } finally { window.AlloModules.UtilsPure = utils; }
  });

  it('the saved key and the quiz normaliser agree, including when the aggregator module is absent', () => {
    const inputs = ['SC1', '  The Water Cycle. ', '"Photosynthesis"', 'an Ecosystem!', 'A  b   c', '', null, 'moon-phases'];
    const withModule = inputs.map(v => U.successCriterionKey(v));
    const saved = window.AlloModules.QuizLiveAggregators; delete window.AlloModules.QuizLiveAggregators;
    try { expect(inputs.map(v => U.successCriterionKey(v))).toEqual(withModule); } finally { window.AlloModules.QuizLiveAggregators = saved; }
    expect(withModule).toEqual(inputs.map(v => Q.normalizeConceptId(v)));
  });
});

describe('C2: results come from the plan\'s own quiz, never a pre-check', () => {
  const plan = (extra = {}) => ({ id: 'plan-3', type: 'lesson-plan', data: { successCriteria: [{ id: 'tides', statement: 'I can explain tides.', source: 'quiz' }], ...extra } });
  it('ignores results from a different quiz when the plan recorded its quiz', () => {
    window.__alloCriterionRollup = rollupFor([mcq('tides', 0)], {}, { quizId: 'quiz-other', quizTitle: 'Other quiz' });
    renderPlan(plan({ successCriteriaQuizId: 'quiz-1' }));
    expect(chips()).toHaveLength(0);
    expect(host.querySelector('[data-criteria-source]').getAttribute('data-criteria-source')).toBe('other-quiz');
  });
  it('never shows pre-check results as criteria met', () => {
    window.__alloCriterionRollup = rollupFor([mcq('tides', 0)], { u1: [0], u2: [0] }, { quizMode: 'pre-check' });
    const reteach = renderPlan(plan());
    expect(chips()).toHaveLength(0);
    expect(host.textContent).not.toContain('Reteach');
    expect(reteach).toHaveLength(0);
  });
  it('names the source quiz in the footer and in the Reteach request', () => {
    window.__alloCriterionRollup = rollupFor([mcq('tides', 0)], { u2: [0] });
    const reteach = renderPlan(plan({ successCriteriaQuizId: 'quiz-1' }));
    expect(chips()).toHaveLength(1);
    expect(host.querySelector('[data-criteria-source]').textContent).toContain('Plants exit ticket');
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Reteach');
    act(() => button.click());
    expect(reteach[0][0].focus).toContain('"Plants exit ticket"');
    expect(reteach[0][0].focus).not.toContain('on the exit ticket');
  });
  it('the live controls publish quiz identity, skip pre-checks and sessionless state, and the host clears stale results', () => {
    const teacher = readFileSync(join(DIR, 'teacher_module.js'), 'utf8');
    expect(teacher).toMatch(/!activeSessionCode \|\| liveQuizMode === ["']pre-check["']/);
    expect(teacher).toMatch(/liveQuizMode !== ["']pre-check["'] && criterionRollup/);
    expect(teacher).toMatch(/quizMode: liveQuizMode/);
    expect(teacher).toMatch(/sessionCode: String\(activeSessionCode\)/);
    const anti = readFileSync(process.env.FIX0927_LP_ANTI || 'AlloFlowANTI.txt', 'utf8');
    expect(anti).toMatch(/const r = typeof window !== 'undefined' \? window\.__alloCriterionRollup : null; if \(!r \|\| \(activeSessionCode && r\.sessionCode === String\(activeSessionCode\)\)\) return; window\.__alloCriterionRollup = null;/);
  });
});

describe('C4: headings follow the saved guide type', () => {
  const tKeys = key => key.startsWith('lesson_headers.') ? '[' + key + ']' : '';
  it('a study guide opened by a teacher keeps its student headings; older plans fall back to the viewer role', () => {
    renderPlan({ id: 'g1', type: 'lesson-plan', config: { generationInputs: { version: 1, mode: 'study', summaries: [], inventory: [] } }, data: { objectives: ['Explain tides'], hook: 'Look outside' } }, { t: tKeys });
    expect(host.textContent).toContain('[lesson_headers.student.objectives]');
    expect(host.textContent).not.toContain('[lesson_headers.teacher.objectives]');
    act(() => root.unmount()); root = null; host.remove();
    renderPlan({ id: 'g2', type: 'lesson-plan', data: { objectives: ['Explain tides'] } }, { t: tKeys, isParentMode: true });
    expect(host.textContent).toContain('[lesson_headers.parent.objectives]');
  });
});

describe('C3 + C4: print/HTML and copy carry success criteria, STEAM tools and the saved guide headings', () => {
  const plan = () => ({ id: 'plan-x', type: 'lesson-plan', title: 'Tides', config: { gradeLevel: '5', generationInputs: { version: 1, mode: 'family', summaries: [], inventory: [] } }, data: {
    essentialQuestion: 'Why do tides change?', objectives: ['Explain tides'], materialsNeeded: [], hook: 'Look at a tide chart', directInstruction: 'Model it', guidedPractice: 'Practice', independentPractice: 'Try it', closure: 'Share',
    successCriteria: [{ id: 'tides', statement: 'I can explain why tides happen.', source: 'quiz' }, 'I can read a tide chart.'],
    recommendedStemTools: [{ id: 'Astronomy', rationale: 'Shows the moon pulling on the oceans.', suggestedActivity: 'Model a spring tide.' }]
  } });
  it('the print/PDF/HTML renderer includes them and uses the family headings', () => {
    window.STEM_TOOL_REGISTRY = [{ id: 'astronomy', name: 'Astronomy Lab' }];
    load('doc_pipeline_module.js');
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Lesson Plan',
      state: { currentUiLanguage: 'English', isParentMode: false, isIndependentMode: false }
    });
    const html = pipeline.generateFullPackHTML([plan()], 'Tides', false, {}, { includeLessonPlan: true });
    const section = new DOMParser().parseFromString(html, 'text/html').getElementById('plan-x');
    const text = section.textContent;
    for (const s of ['I can explain why tides happen.', 'I can read a tide chart.', 'Astronomy Lab', 'Shows the moon pulling on the oceans.', 'Model a spring tide.']) expect(text).toContain(s);
    expect(text).toContain('lesson_headers.parent.hook');
    expect(text).not.toContain('lesson_headers.teacher.hook');
    delete window.STEM_TOOL_REGISTRY;
  });
  it('copy includes them and uses the saved headings', async () => {
    window.STEM_TOOL_REGISTRY = [{ id: 'astronomy', name: 'Astronomy Lab' }];
    const clipboard = vi.fn().mockResolvedValue(); vi.stubGlobal('navigator', { clipboard: { writeText: clipboard } });
    const t = key => ({ 'lesson_headers.parent.hook': 'Family starter', 'lesson_headers.teacher.hook': 'Teacher hook' }[key] || key);
    await EH.handleCopyToClipboard({ generatedContent: plan(), t, addToast: () => {}, warnLog: () => {}, isParentMode: false, isIndependentMode: false });
    const text = clipboard.mock.calls[0][0];
    for (const s of ['I can explain why tides happen.', 'I can read a tide chart.', 'Astronomy Lab', 'Shows the moon pulling on the oceans.', 'Family starter']) expect(text).toContain(s);
    expect(text).not.toContain('Teacher hook');
    delete window.STEM_TOOL_REGISTRY;
  });
});

describe('C5: the STEAM tool button opens the named tool in the viewer language', () => {
  it('requests the tool plugin with the registry id and uses the translated label', () => {
    window.STEM_TOOL_REGISTRY = [{ id: 'circuit', name: 'Circuit Builder' }];
    const ensure = vi.fn(); window.__alloEnsureStemPluginLoaded = ensure;
    const setStemLabTool = vi.fn(), setShowStemLab = vi.fn(), setStemLabTab = vi.fn();
    const t = key => ({ 'lesson_plan.stem_open_tool': 'Abrir herramienta' }[key] || '');
    renderPlan({ id: 'p5', type: 'lesson-plan', data: { recommendedStemTools: [{ id: 'Circuit', rationale: 'Build a circuit.' }] } }, { t, setStemLabTool, setShowStemLab, setStemLabTab });
    const button = host.querySelector('button[aria-label="Abrir herramienta: Circuit Builder"]');
    expect(button).not.toBeNull();
    act(() => button.click());
    expect(ensure).toHaveBeenCalledWith('circuit');
    expect(setStemLabTool).toHaveBeenCalledWith('circuit');
    expect(setShowStemLab).toHaveBeenCalledWith(true);
    delete window.STEM_TOOL_REGISTRY; delete window.__alloEnsureStemPluginLoaded;
  });
});
