import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const base = require('../concept_quest_engine.js');
const solo = require('../concept_quest_solo_engine.js');
const source = readFileSync('generate_dispatcher_source.jsx', 'utf8');
const begin = source.indexOf('const _jsonExamplesByType = {');
const end = source.indexOf('\n        };', begin);
if (begin < 0 || end < 0) throw new Error('Canonical Assess generation examples were not found.');
const authored = new Function(source.slice(begin, end + '\n        };'.length) + '\nreturn _jsonExamplesByType;')();
const content = questions => ({ id: 'source-contract', title: 'Lesson', data: { questions } });
let helpers;
beforeAll(() => {
  window.AlloModules.ConceptQuestEngine = base;
  const gm = readFileSync('concept_quest_solo_gm_source.jsx', 'utf8');
  helpers = new Function('window', gm.slice(0, gm.indexOf('function ConceptQuestSoloGM(')) + '\nreturn ConceptQuestSoloGMHelpers;')(window);
});
function packet(quest, resource, input = '') {
  const prompt = helpers.prompt(helpers.context(quest, resource, input), null, null);
  return JSON.parse(prompt.split('CONTEXT_JSON_START\n\n')[1].split('\n\nCONTEXT_JSON_END')[0]);
}
const valid = patch => JSON.stringify({ narrative: 'A lantern lights the path toward a notebook.', character: null, feedback: '', evidence: '', choices: [{ intent: 'investigate', label: 'Inspect the notebook', prompt: 'I inspect the notebook.' }], memory: 'A lantern and notebook guide the learner.', ...patch });
function correctResponse(item) {
  if (item.type === 'mcq') return { answerIndex: item.correctIndex };
  throw new Error('This helper only runs MCQ journeys.');
}

describe('Solo GM uses the actual authored Assess schema', () => {
  it('retains all nine production example formats and marks only written types for self-review', () => {
    const bank = solo.normalizeItems(content(Object.values(authored)));
    expect(bank).toHaveLength(9);
    expect(bank.filter(item => item.selfReviewRequired).map(item => item.type)).toEqual(['short-answer', 'self-explanation']);
  });
  it('includes Answer + Evidence choices even when normalized options is an empty array', () => {
    const resource = content([authored['answer-evidence']]);
    const quest = solo.travel(base, solo.createSession(base, resource), 'room-2').quest;
    const current = packet(quest, resource).authoritativeGameFacts.currentQuestion;
    expect(current.options).toEqual(authored['answer-evidence'].answerOptions);
    expect(current.evidenceOptions).toEqual(authored['answer-evidence'].evidenceOptions);
    expect(current.evidencePrompt).toBe(authored['answer-evidence'].evidencePrompt);
    expect(current).not.toHaveProperty('correctAnswer');
    expect(current).not.toHaveProperty('correctEvidence');
  });
  it('sends the presented sequence and all principle choices without the canonical order/key', () => {
    const item = solo.normalizeItems(content([authored['sequence-sense']]))[0];
    const current = helpers.questionView(item, false);
    expect(current.presentedItems).toEqual(['first', 'third', 'second', 'fourth']);
    expect(current.principleOptions).toEqual(authored['sequence-sense'].principleOptions);
    expect(current).not.toHaveProperty('items');
    expect(current).not.toHaveProperty('presentedOrder');
    expect(current).not.toHaveProperty('orderingPrinciple');
    expect(current).not.toHaveProperty('intentionallyWrongIndex');
  });
  it('normalizes generator-supported sequence text objects for UI and answer guides', () => {
    const item = solo.normalizeItems(content([{ ...authored['sequence-sense'], items: authored['sequence-sense'].items.map(text => ({ text })) }]))[0];
    expect(item.items).toEqual(['first', 'second', 'third', 'fourth']);
    expect(item.selfReviewRequired).toBe(false);
    expect(solo.answerGuide(item)).toContain('first → second → third → fourth');
    expect(helpers.questionView(item, false).presentedItems).toEqual(['first', 'third', 'second', 'fourth']);
  });
  it('sends displayed relation pairs and units without repair or numeric keys', () => {
    const relation = helpers.questionView(solo.normalizeItems(content([authored['relation-mismatch']]))[0], false);
    expect(relation.pairs).toEqual(authored['relation-mismatch'].pairs);
    expect(relation.candidatePartners).toEqual(authored['relation-mismatch'].candidatePartners);
    expect(relation).not.toHaveProperty('wrongPairIndex');
    expect(relation).not.toHaveProperty('correctPartnerForWrong');
    const numeric = helpers.questionView(solo.normalizeItems(content([authored['numeric-response']]))[0], false);
    expect(numeric.unit).toBe('cm');
    expect(numeric).not.toHaveProperty('correctValue');
    expect(numeric).not.toHaveProperty('tolerance');
    expect(numeric.concept).toBe(authored['numeric-response'].conceptLabel);
  });
  it('uses source-index identity when different items have identical prompts', () => {
    const resource = content([{ type: 'mcq', question: 'Choose the best claim.', options: ['Maple', 'Pine'], correctAnswer: 'Maple' }, { type: 'mcq', question: 'Choose the best claim.', options: ['Cedar', 'Oak'], correctAnswer: 'Cedar' }]);
    let quest = solo.travel(base, solo.createSession(base, resource), 'room-2').quest;
    quest = solo.resolveTurn(base, quest, { roleId: 'analyst', abilityId: 'analyze', response: { answerIndex: 0 } }).quest;
    expect(solo.currentItem(quest).sourceIndex).toBe(1);
    const ctx = helpers.context(quest, resource, '');
    expect(ctx.attempted).toBe(false);
    expect(() => helpers.parseResponse(valid({ feedback: 'Cedar is what you should select.' }), ctx)).toThrow('answer-reveal');
  });
  it('focuses late-bank source context while preserving stable conversation scope', () => {
    const resource = content(Array.from({ length: 100 }, (_, index) => ({ type: 'mcq', question: 'Describe lesson item ' + index, options: ['ChoiceA' + index, 'ChoiceB' + index], correctAnswer: 'ChoiceA' + index, conceptLabel: 'Concept ' + index, factCheck: 'Resolved explanation ' + index })));
    let quest = solo.travel(base, solo.createSession(base, resource), 'room-2').quest;
    const initial = helpers.context(quest, resource, '');
    while (solo.currentItem(quest).sourceIndex < 95) {
      if (quest.phase === 'explore') quest = solo.travel(base, quest, 'room-' + (Number(quest.currentRoomId.slice(5)) + 1)).quest;
      else quest = solo.resolveTurn(base, quest, { roleId: 'analyst', abilityId: 'analyze', response: correctResponse(solo.currentItem(quest)) }).quest;
    }
    const current = helpers.context(quest, resource, '');
    expect(current.scope).toBe(initial.scope);
    expect(current.sceneKey).not.toBe(initial.sceneKey);
    expect(current.source.startsWith('Concept 95\nDescribe lesson item 95')).toBe(true);
    expect(current.source).toContain('Resolved explanation 94');
    expect(current.source).not.toContain('Resolved explanation 95');
    expect(current.source.length).toBeLessThanOrEqual(helpers.LIMITS.source);
    const facts = packet(quest, resource).authoritativeGameFacts;
    expect(facts.currentQuestion.concept).toBe('Concept 95');
    expect(facts.lastResolvedTurn.answerGuide).toBe('ChoiceA94');
    expect(facts.lastResolvedTurn.score).toBe(1);
    expect(facts.lastResolvedTurn.maxScore).toBe(1);
    expect(helpers.context(quest, resource, 'Changed lesson').scope).not.toBe(current.scope);
  });
});
