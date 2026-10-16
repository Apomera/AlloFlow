import { describe, it, expect } from 'vitest';
import { fundingCost, fundingOptions } from '../lesson_board_funding.js';

describe('Construction resource exchanges', () => {
  const board = { playStyle: 'tabletop' }, project = { cost: [3, 2] };
  it('offers one bounded substitution in either direction', () => {
    expect(fundingOptions(board, project, [5, 1])).toEqual([
      { id: 'standard', cost: [3, 2], affordable: false },
      { id: 'research', cost: [5, 1], affordable: true, trade: { give: 0, take: 1 } },
      { id: 'build', cost: [2, 4], affordable: false, trade: { give: 1, take: 0 } }
    ]);
    for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) {
      for (const option of fundingOptions(board, { cost: [a, b] }, [9, 9]).filter(item => item.trade)) {
        expect(option.cost[0] + option.cost[1]).toBe(a + b + 1);
        expect(option.cost.every(value => value >= 0)).toBe(true);
        expect(option.cost[option.trade.give] - [a, b][option.trade.give]).toBe(2);
        expect([a, b][option.trade.take] - option.cost[option.trade.take]).toBe(1);
      }
    }
  });
  it('never substitutes a token absent from the printed cost', () => {
    expect(fundingOptions(board, { cost: [3, 0] }, [9, 9]).map(option => option.id)).toEqual(['standard', 'build']);
    expect(fundingCost(board, { cost: [0, 3] }, 'build')).toBeNull();
  });
  it('keeps legacy construction unchanged and rejects invalid modes', () => {
    expect(fundingOptions({}, project, [3, 2])).toEqual([{ id: 'standard', cost: [3, 2], affordable: true }]);
    for (const id of ['', 'free', null, {}, 1]) expect(fundingCost(board, project, id)).toBeNull();
    expect(fundingCost({}, project, 'research')).toBeNull();
    expect(fundingOptions(board, {}, [10, 10])).toEqual([]);
    expect(fundingOptions(board, project, [NaN, 10]).every(option => !option.affordable)).toBe(true);
  });
  it('does not mutate or share cost arrays with the board', () => {
    const frozen = Object.freeze({ cost: Object.freeze([3, 2]) });
    const options = fundingOptions(Object.freeze(board), frozen, Object.freeze([5, 1]));
    options[0].cost[0] = 100;
    expect(fundingCost(board, frozen)).toEqual([3, 2]);
  });
});
