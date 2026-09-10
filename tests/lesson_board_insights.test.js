import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { learningSummary, moveDetails, proposalSummary, responseText } from '../lesson_board_insights.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
const reviewed = (targetId, marks, success = true) => ({ phase: 'review', targetId, result: { success, marks } });

describe('Board decision previews and learning records', () => {
  it('includes earned project bonuses in the reward preview', () => {
    const board = makeBoard(), run = { turn: 3, steps: { t0: reviewed('heater', { u: true }), t1: reviewed('cloud', { u: true }), t2: reviewed('research', {}), t3: engine.emptyStep() } };
    expect(moveDetails(board, run, 'river').reward).toEqual([3, 1]);
    expect(moveDetails(board, run, 'heater').reward).toEqual([0, 0]);
    expect(moveDetails(board, run, 'river').newConcept).toBe(true);
    expect(moveDetails(board, run, 'river').opens.map(item => item.id)).toEqual(['lake']);
    expect(moveDetails(board, run, 'river').connections.map(item => item.id)).toEqual(['heater', 'lake']);
  });
  it('shows exact construction shortfalls, remaining resources and redundant shortcuts', () => {
    const board = makeBoard(), run = { turn: 2, steps: { t0: reviewed('heater', { u: true }), t1: reviewed('cloud', { u: true }), t2: engine.emptyStep() } };
    expect(moveDetails(board, engine.emptyRun(), 'bridge').shortfall).toEqual([2, 2]);
    expect(moveDetails(board, run, 'bridge')).toMatchObject({ affordable: true, after: [2, 0], pathAlreadyOpen: false });
    run.steps.t2 = reviewed('rain', { u: true }); run.turn = 3; run.steps.t3 = engine.emptyStep();
    expect(moveDetails(board, run, 'bridge').pathAlreadyOpen).toBe(true);
  });
  it('keeps incorrect and missing individual responses distinct from shared success', () => {
    const board = makeBoard(), run = { turn: 3, steps: { t0: reviewed('heater', { u: true, v: false, outsider: true }), t1: reviewed('cloud', { v: true }), t2: reviewed('river', { u: false }, false), t3: { phase: 'answer', targetId: 'rain', answers: { u: { correct: true } } } } };
    const result = learningSummary(board, run, { u: { name: 'Rowan' }, v: { name: 'Sky' }, absent: { name: 'River' } });
    expect(result.learners.map(item => [item.answered, item.correct])).toEqual([[2, 1], [2, 1], [0, 0]]);
    expect(result.concepts.find(item => item.id === 'temperature')).toMatchObject({ responded: 2, demonstrated: 2 });
    expect(result.concepts.find(item => item.id === 'cycle')).toMatchObject({ responded: 1, demonstrated: 0 });
    expect(result.learners[1].concepts.find(item => item.id === 'cycle').answered).toBe(0);
  });
  it('aggregates only eligible proposals for available moves without ranking learners', () => {
    const run = engine.emptyRun(); run.steps.t0.votes = { u: 'heater', v: 'cloud', w: 'heater', distant: 'weather', outsider: 'cloud' };
    expect(proposalSummary(makeBoard(), run, { u: {}, v: {}, w: {}, distant: {} })).toEqual([{ id: 'heater', name: 'Heating station', count: 2 }, { id: 'cloud', name: 'Cloud laboratory', count: 1 }]);
  });
  it('translates each response format to lesson text and rejects malformed values', () => {
    const board = makeBoard();
    for (const node of board.locations) expect(responseText(node, engine.solution(node))).not.toBe('');
    expect(responseText(board.locations[0], '1')).toBe(board.locations[0].options[1]);
    expect(responseText(board.locations[1], '1,0')).toContain(board.locations[1].controls[0].options[1]);
    expect(responseText(board.locations[5], '2,3,0,1')).toMatch(/^1\./);
    expect(responseText(board.locations[5], '1,1,1,1')).toBe('');
  });
});
