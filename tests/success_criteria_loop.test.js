// Success-criteria loop: exit ticket (generated first) -> lesson plan (generated
// last) derives criteria keyed by the quiz's concept labels -> live answers roll
// up by the same labels -> the plan shows mastery and offers Reteach through the
// existing next-lesson machinery. Pure parts run through the real code (the
// utils helpers sliced from source, the aggregator loaded as shipped); the wiring
// is pinned in the sources and the built modules.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const utilsSource = read('utils_pure_source.jsx');
const prompts = read('prompts_library_source.jsx');
const dispatcher = read('generate_dispatcher_source.jsx');
const planView = read('view_lesson_plan_source.jsx');
const teacher = read('teacher_source.jsx');
const aggregatorsSource = read('quiz_live_aggregators.js');

function loadUtilsHelpers() {
    const start = utilsSource.indexOf('// --- Success criteria ---');
    const end = utilsSource.indexOf('const getAssetManifest = (historyItems, options = {}) => {');
    if (start === -1 || end === -1) throw new Error('success-criteria helpers not found in utils_pure_source.jsx');
    const body = utilsSource.slice(start, end);
    const sandbox = {};
    vm.runInNewContext(body + '\nthis.helpers = { getQuizConceptLabels, normalizeSuccessCriteria };', sandbox, { filename: 'utils-success-criteria.js' });
    return sandbox.helpers;
}

function loadAggregators() {
    const w = {};
    vm.runInNewContext(aggregatorsSource, { window: w, console: { log() {}, warn() {}, error() {} } }, { filename: 'quiz_live_aggregators.js' });
    return w.AlloModules.QuizLiveAggregators;
}

const quiz = (labels) => ({ id: 'q1', type: 'quiz', data: { questions: labels.map((l, i) => ({ type: 'mcq', question: 'Q' + i, options: ['a', 'b', 'c'], correctAnswer: 'b', conceptLabel: l })) } });

describe('concept labels from the exit ticket', () => {
    const { getQuizConceptLabels } = loadUtilsHelpers();
    it('collects unique, trimmed labels in question order and tolerates junk', () => {
        expect(getQuizConceptLabels(quiz(['tides ', 'moon phases', 'tides', '', null]))).toEqual(['tides', 'moon phases']);
        expect(getQuizConceptLabels({ type: 'quiz', data: {} })).toEqual([]);
        expect(getQuizConceptLabels(null)).toEqual([]);
    });
});

describe('normalizeSuccessCriteria', () => {
    const { normalizeSuccessCriteria } = loadUtilsHelpers();

    it('snaps paraphrased or slugged ids back to the exact concept label so results can land', () => {
        const out = normalizeSuccessCriteria([
            { id: 'Tides', statement: 'I can explain why tides happen.' },
            { id: 'moon-phases', statement: 'I can name the moon phases.' },
            { id: 'made-up', statement: 'I can describe how gravity shapes the ocean.' },
        ], { concepts: ['tides', 'moon phases', 'gravity'] });
        expect(out.map((c) => c.id)).toEqual(['tides', 'moon phases', 'gravity']);
        expect(out.every((c) => c.source === 'quiz')).toBe(true);
    });

    it('adds any quiz concept the model dropped, with an honest placeholder statement', () => {
        const out = normalizeSuccessCriteria([{ id: 'tides', statement: 'I can explain tides.' }], { concepts: ['tides', 'moon phases'] });
        expect(out).toEqual([
            { id: 'tides', statement: 'I can explain tides.', source: 'quiz' },
            { id: 'moon phases', statement: 'I can moon phases.', source: 'quiz' },
        ]);
    });

    it('derives from objectives only when there is no quiz and nothing usable was returned', () => {
        const out = normalizeSuccessCriteria(null, { concepts: [], objectives: ['Explain why tides happen', 'I can name the moon phases.'] });
        expect(out).toEqual([
            { id: 'explain-why-tides-happen', statement: 'I can explain why tides happen', source: 'objective' },
            { id: 'i-can-name-the-moon-phases', statement: 'I can name the moon phases.', source: 'objective' },
        ]);
        expect(normalizeSuccessCriteria([], { concepts: [], objectives: [] })).toEqual([]);
    });

    it('dedupes ids, accepts strings, and caps the list', () => {
        const many = Array.from({ length: 12 }, (_, i) => 'I can do thing ' + i + '.');
        const out = normalizeSuccessCriteria(many.concat(['I can do thing 0.']), { concepts: [] });
        expect(out.length).toBe(8);
        expect(new Set(out.map((c) => c.id)).size).toBe(8);
        expect(out[0]).toEqual({ id: 'i-can-do-thing-0', statement: 'I can do thing 0.', source: 'objective' });
    });
});

describe('aggregateSuccessCriteria (live answers rolled up by concept label)', () => {
    const agg = loadAggregators();
    const questions = [
        { type: 'mcq', question: 'Q0', options: ['a', 'b', 'c'], correctAnswer: 'b', conceptLabel: 'tides' },
        { type: 'mcq', question: 'Q1', options: ['a', 'b', 'c'], correctAnswer: 'c', conceptLabel: 'tides' },
        { type: 'mcq', question: 'Q2', options: ['a', 'b', 'c'], correctAnswer: 'a', conceptLabel: 'moon phases' },
        { type: 'mcq', question: 'Q3', options: ['a', 'b', 'c'], correctAnswer: 'a' },
    ];
    const generatedContent = { id: 'quiz-1', data: { questions } };
    // Live MCQ answers arrive as an option index (or an envelope carrying one),
    // exactly what the item analysis grades; option TEXT is not a live shape.
    const resp = (idx, answerText, conceptLabel) => ({ itemType: 'mcq', conceptLabel, answer: { optionIdx: questions[idx].options.indexOf(answerText) }, questionIdx: idx });

    it('counts met and total per label using the same grader the item analysis uses, and never returns identities', () => {
        const allResponses = {
            'mb-1': { 0: resp(0, 'b', 'tides'), 1: resp(1, 'a', 'tides'), 2: resp(2, 'a', 'moon phases') },
            'mb-2': { 0: resp(0, 'c', 'tides'), 2: resp(2, 'b', 'moon phases'), 3: resp(3, 'a', '') },
            'mb-3': { 0: resp(0, 'b', ''), note: 'not a question index' },
        };
        const expected = {};
        Object.values(allResponses).forEach((per) => Object.entries(per).forEach(([k, r]) => {
            const idx = Number(k);
            if (!Number.isInteger(idx) || !questions[idx]) return;
            const label = (r.conceptLabel || questions[idx].conceptLabel || '').trim();
            if (!label) return;
            const st = agg.gradeResponseForItem(r, questions[idx]).status;
            if (!['correct', 'incorrect', 'partially-correct'].includes(st)) return;
            expected[label] = expected[label] || { met: 0, total: 0 };
            expected[label].total += 1;
            if (st === 'correct') expected[label].met += 1;
        }));
        const out = agg.aggregateSuccessCriteria({ allResponses }, generatedContent, null);
        expect(Object.keys(out.byConcept).sort()).toEqual(Object.keys(expected).sort());
        Object.entries(expected).forEach(([label, e]) => {
            expect(out.byConcept[label].met).toBe(e.met);
            expect(out.byConcept[label].total).toBe(e.total);
        });
        expect(out.byConcept.tides.met).toBe(2);
        expect(out.byConcept.tides.total).toBe(4);
        expect(out.byConcept['moon phases']).toMatchObject({ met: 1, total: 2 });
        expect(out.byConcept['tides'].questionIdxs).toEqual([0, 1]);
        expect(out.respondents).toBe(3);
        expect(JSON.stringify(out)).not.toContain('mb-1');
    });

    it('respects the roster, prefers the label stamped on the response, and returns nothing when nothing is labelled', () => {
        const allResponses = { 'mb-1': { 0: resp(0, 'b', 'stamped label') }, 'ghost': { 0: resp(0, 'b', 'tides') } };
        const out = agg.aggregateSuccessCriteria({ allResponses }, generatedContent, { 'mb-1': { name: 'x' } });
        expect(Object.keys(out.byConcept)).toEqual(['stamped label']);
        expect(out.respondents).toBe(1);
        const empty = agg.aggregateSuccessCriteria({ allResponses: { 'mb-1': { 3: resp(3, 'a', '') } } }, generatedContent, null);
        expect(empty.byConcept).toEqual({});
        expect(agg.aggregateSuccessCriteria(null, null, null)).toEqual({ byConcept: {}, respondents: 0, questionCount: 0 });
    });
});

describe('wiring pins', () => {
    it('the manifest carries the quiz concepts and the prompt requires criteria keyed by them', () => {
        expect(utilsSource).toContain("if (item.type === 'quiz') {");
        expect(utilsSource).toContain('manifest += `    concepts: ${concepts.join(\'; \')}\\n`;');
        expect(prompts).toContain('SUCCESS CRITERIA (REQUIRED)');
        expect(prompts).toContain('"successCriteria": [');
        expect(prompts).toContain('"id": "exact concept label from the quiz, or a short-slug"');
    });

    it('the dispatcher normalises criteria from the latest quiz in history, and quizzes generated after a plan cover its criteria', () => {
        expect(dispatcher).toContain('"successCriteria": [{ "id": "exact quiz concept label, or short-slug", "statement": "I can ...", "source": "quiz" }],');
        expect(dispatcher).toContain("_utils.normalizeSuccessCriteria(content.successCriteria, { concepts: _concepts, objectives: content.objectives })");
        expect(dispatcher).toContain("if (_latestQuiz) content.successCriteriaQuizId = _latestQuiz.id;");
        expect(dispatcher).toContain('SUCCESS CRITERIA TO COVER (from the current lesson plan)');
        expect(dispatcher.split('${_criteriaDirective}').length - 1).toBe(2);
    });

    it('the plan view renders criteria with mastery and Reteach through the next-lesson machinery, and re-renders on rollup', () => {
        expect(planView).toContain('data-success-criteria="plan"');
        expect(planView).toContain("window.__alloCriterionRollup");
        expect(planView).toContain("handleLessonPlanChange('successCriteria', { ...c, statement: e.target.value }, i)");
        expect(planView).toContain("type: 'Remediation',");
        expect(planView).toContain("window.addEventListener('alloflow:criterion-rollup', onRollup);");
        expect(planView).toContain('data-criterion-mastery={c.id}');
    });

    it('the live quiz controls compute the rollup with the aggregator, publish it, and show it against the plan', () => {
        expect(teacher).toContain('agg.aggregateSuccessCriteria(quizState, generatedContent, roster)');
        expect(teacher).toContain('window.__alloCriterionRollup = {');
        expect(teacher).toContain("window.dispatchEvent(new CustomEvent('alloflow:criterion-rollup'))");
        expect(teacher).toContain('data-live-success-criteria="true"');
        expect(aggregatorsSource).toContain('aggregateSuccessCriteria: aggregateSuccessCriteria,');
    });

    it('ships in the built modules and their public mirrors', () => {
        for (const m of ['utils_pure_module.js', 'prompts_library_module.js', 'generate_dispatcher_module.js', 'view_lesson_plan_module.js', 'teacher_module.js', 'quiz_live_aggregators.js']) {
            const root = read(m);
            const pub = read(path.join('desktop', 'web-app', 'public', m));
            expect(root, m).toBe(pub);
            expect(root, m).toMatch(/successcriteria/i);
        }
    });
});
