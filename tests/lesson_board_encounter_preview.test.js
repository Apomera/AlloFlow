import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { encounterDecision } from '../lesson_board_encounter_preview.js';

const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
function board(options = {}) {
  const value = { ...makeBoard(), playStyle: 'tabletop', goal: 'expedition', chance: true, ...options };
  value.edges = value.locations.slice(1).map((node, index) => [value.locations[index].id, node.id]);
  return value;
}
const choose = (b, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(b, run, choice));
function move(b, run, id, dice = [1, 1]) {
  if (engine.stepOf(run).phase === 'review') run = engine.merge(run, engine.advance(b, run));
  run = engine.merge(run, engine.begin(b, run, id));
  if (engine.stepOf(run).phase !== 'answer') return run;
  const node = b.locations.find(item => item.id === id);
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'decision-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'decision-test', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice }));
}
const pending = (b, die = 6) => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud', [die, die]);
const names = result => result.choices.map(choice => choice.id);

describe('Private encounter decision previews', () => {
  it('exists only while an actual saved encounter is pending', () => {
    const b = board(), run = pending(b);
    expect(encounterDecision(b, engine.emptyRun())).toBeNull();
    expect(encounterDecision({ ...b, chance: false }, run)).toBeNull();
    expect(encounterDecision({ ...b, playStyle: 'learning' }, run)).toBeNull();
    expect(encounterDecision(b, choose(b, run, 'collect'))).toBeNull();
    expect(encounterDecision(null, null)).toBeNull();
  });

  it('groups only the saved family’s legal existing choices and preserves offered target order', () => {
    const b = board();
    for (const die of [1, 6, 11, 16]) {
      const run = pending(b, die), result = encounterDecision(b, run), card = engine.fieldOpportunity(b, run);
      expect(result.preview).toBeNull();
      expect(result.groups.flatMap(group => group.choices)).toEqual(result.choices);
      expect(names(result).slice(0, die===1?5:3)).toEqual(die===1?['collect','prepare','venture:0','venture:1','crew']:['collect','prepare','crew']);
      expect(result.groups.some(group=>group.id==='venture')).toBe(die===1);
      expect(result.choices.filter(choice => choice.kind === 'lead').map(choice => choice.targetId)).toEqual(card.leads.map(lead => lead.targetId));
      expect(result.groups.some(group => group.id === 'trade')).toBe([6, 16].includes(die));
      expect(result.groups.some(group => group.id === 'commission')).toBe([6, 16].includes(die));
      expect(result.groups.some(group => group.id === 'delivery')).toBe([1, 11].includes(die));
      for (const choice of result.choices) expect(() => engine.chooseFieldOpportunity(b, run, choice.id)).not.toThrow();
    }
  });

  it('shows collection as an immediate balance change with no future reward', () => {
    const b = board(); b.projects.find(project => project.id === 'network').cost = [4, 3];
    const run = pending(b), before = engine.derive(b, run).balance;
    const result = encounterDecision(b, run, 'collect').preview;
    expect(result).toMatchObject({ choice: 'collect', kind: 'collect', trigger: 'immediate', before, after: [before[0], before[1] + 1], spent: [0, 0], gain: [0, 1], reserved: null });
    expect(result.newlyFunded).toContain('network');
    expect(result.inspectIds).toEqual(result.newlyFunded);
  });

  it.each([0, 1])('shows both payment and immediate gain for exchange %s', direction => {
    const b = board(), run = pending(b), trade = engine.fieldOpportunity(b, run).trades[direction];
    const result = encounterDecision(b, run, trade.id).preview;
    expect(result).toMatchObject({ choice: trade.id, trigger: 'immediate', after: trade.after, spent: trade.cost, gain: trade.gain, reserved: null });
    expect(result.after).toEqual(result.before.map((value, index) => value - result.spent[index] + result.gain[index]));
  });

  it.each([
    ['prepare', 6, 'investigation', [0, 2]],
    ['crew', 6, 'construction', [1, 1]],
    ['commission:research', 6, 'commission', [3, 1]],
    ['delivery:heater', 1, 'delivery', null],
    ['lead:cooler', 1, 'destination', null]
  ])('keeps %s reserved until its actual trigger', (choice, die, trigger, expectedReward) => {
    const b = board(), run = pending(b, die), result = encounterDecision(b, run, choice), preview = result.preview;
    expect(preview).not.toBeNull();
    expect(preview.after).toEqual(preview.before);
    expect(preview.spent).toEqual([0, 0]);
    expect(preview.gain).toEqual([0, 0]);
    expect(preview.reserved).toMatchObject({ trigger, reward: expectedReward || result.choices.find(item => item.id === choice).reward });
    if (choice.includes(':')) expect(preview.inspectIds).toEqual([choice.split(':')[1]]);
    if (choice.startsWith('commission:')) expect(preview.reserved.projectId).toBe('research');
    if (choice.startsWith('delivery:')) expect(preview.reserved.targetId).toBe('heater');
    if (choice.startsWith('lead:')) expect(preview.reserved.targetId).toBe('cooler');
  });

  it('does not allow deferred supplies to pay an unaffordable commission', () => {
    const b = board(); b.projects.find(project => project.id === 'research').cost = [6, 3];
    const run = pending(b), preview = encounterDecision(b, run, 'commission:research').preview;
    expect(preview.reserved.reward).toEqual([3, 1]);
    expect(preview.after).toEqual([5, 2]);
    expect(preview.newlyFunded).not.toContain('research');
  });

  it('filters trades that lack a token or would consume the construction reserve', () => {
    const poor = board(); poor.locations.slice(0, 2).forEach(node => { node.reward = [0, 1]; });
    const poorRun = pending(poor, 7), poorDecision = encounterDecision(poor, poorRun, 'trade:0');
    expect(names(poorDecision)).not.toContain('trade:0'); expect(poorDecision.preview).toBeNull();
    const reserve = board({ goal: 'architect' });
    reserve.projects[0].cost = [5, 3]; reserve.projects[1].cost = [6, 2]; reserve.projects[2].cost = [5, 3];
    const reserveDecision = encounterDecision(reserve, pending(reserve, 7), 'trade:0');
    expect(names(reserveDecision)).not.toContain('trade:0'); expect(names(reserveDecision)).toContain('trade:1'); expect(reserveDecision.preview).toBeNull();
  });

  it('keeps occupied commitments out of later choices without replacing them in a preview', () => {
    const b = board(); let run = choose(b, pending(b, 1), 'crew');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id, [6, 6]);
    expect(names(encounterDecision(b, run))).not.toContain('crew');
    run = choose(b, run, 'commission:research');
    for (const id of ['sequence', 'cooler', 'weather']) run = move(b, run, id, [6, 6]);
    const result = encounterDecision(b, run);
    expect(result.groups.map(group => group.id)).not.toContain('commission');
    expect(names(result)).not.toContain('crew');
    expect(names(result)).not.toContain('prepare');
    expect(result.groups.map(group => group.id)).not.toContain('lead');
    expect(encounterDecision(b, run, 'commission:research').preview).toBeNull();
    expect(engine.derive(b, run).fieldCommission.projectId).toBe('research');
  });

  it('rejects off-offer or malformed selected IDs without selecting an implicit fallback', () => {
    const b = board(), run = pending(b);
    for (const choice of ['commission:network', 'lead:missing', 'delivery:heater', 'pending', 'trade:2', {}, null, undefined]) expect(encounterDecision(b, run, choice).preview).toBeNull();
  });

  it('invalidates a draft after board or mechanical history changes at the same turn, while excluding answers', () => {
    const b = board(), run = pending(b), key = encounterDecision(b, run).key;
    const answerOnly = copy(run); engine.stepOf(answerOnly).answers = { learner: { value: 'private answer' } }; engine.stepOf(answerOnly).result.marks = { learner: { correct: false, value: 'private answer' } };
    expect(encounterDecision(b, answerOnly).key).toBe(key);
    expect(key).not.toContain('private answer');
    const differentDie = copy(run); engine.stepOf(differentDie).result.dice = [7];
    expect(encounterDecision(b, differentDie).key).not.toBe(key);
    const changed = copy(b); changed.projects[0].cost[0] += 1;
    expect(encounterDecision(changed, run).key).not.toBe(key);
    expect(encounterDecision(b, copy(run)).key).toBe(key);
  });

  it('never mutates the saved run or board, and exported amounts are independent copies', () => {
    const b = board(), run = pending(b), before = JSON.stringify([b, run]);
    const result = encounterDecision(b, run, 'commission:research');
    result.preview.before[0] = 999; result.preview.after[0] = 999; result.preview.reserved.reward[0] = 999;
    result.choices.find(choice => choice.id === 'commission:research').reward[0] = 999;
    expect(JSON.stringify([b, run])).toBe(before);
    const again = encounterDecision(b, run, 'commission:research');
    expect(again.preview.before).toEqual([5, 2]); expect(again.preview.reserved.reward).toEqual([3, 1]);
    expect(engine.stepOf(run).result.fieldChoice).toBe('pending');
    expect(run.turn).toBe(1);
  });
});
