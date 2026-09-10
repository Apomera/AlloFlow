import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const src = readFileSync('sel_hub/sel_tool_goals.js', 'utf8');
const start = src.indexOf('  function goalReviewSnapshot(');
const end = src.indexOf('  var SMART_LABELS', start);
const { goalReviewSnapshot, goalReviewRating, goalReviewRatingText } = new Function(src.slice(start, end) + '; return { goalReviewSnapshot, goalReviewRating, goalReviewRatingText };')();
const now = 2000000000000;
const day = 86400000;
describe('Goal weekly review data', () => {
  it('separates recent, older, future and undated completions', () => {
    const goals = [{ id: 'a', text: 'Practice', steps: [
      { done: true, completedAt: now - day }, { done: true, completedAt: now - 8 * day },
      { done: true }, { done: false, completedAt: now - day }, { done: true, completedAt: now + day }
    ] }];
    expect(goalReviewSnapshot(goals, now)[0]).toMatchObject({ stepsComplete: 1, totalComplete: 4, totalSteps: 5, undatedComplete: 1 });
  });
  it('includes the start/end boundaries and leaves original data untouched', () => {
    const goals = [{ id: 'a', steps: [{ done: true, completedAt: now - 7 * day }, { done: true, completedAt: now }] }];
    const before = JSON.stringify(goals);
    expect(goalReviewSnapshot(goals, now)[0].stepsComplete).toBe(2);
    expect(JSON.stringify(goals)).toBe(before);
  });
  it('does not invent timestamps for legacy completed steps', () => {
    expect(goalReviewSnapshot([{ id: 'a', steps: [{ done: true }, { done: true, completedAt: 'yesterday' }] }], now)[0]).toMatchObject({ stepsComplete: 0, undatedComplete: 2, totalComplete: 2 });
  });
  it('retains goals with no checked steps as an honest zero', () => {
    expect(goalReviewSnapshot([{ id: 'a' }], now)[0]).toMatchObject({ stepsComplete: 0, totalComplete: 0, totalSteps: 0 });
    expect(goalReviewSnapshot([], now)).toEqual([]);
  });
  it('treats an omitted or invalid rating as missing, not zero', () => {
    for (const value of [null, undefined, 0, 6, 1.5, '4', NaN]) expect(goalReviewRating(value)).toBeNull();
    expect(goalReviewRatingText([{ rating: 0 }, { rating: null }])).toBe('No weekly ratings recorded.');
  });
  it('averages only rated reviews and counts reviews rather than weeks', () => {
    expect(goalReviewRatingText([{ rating: null }, { rating: 2 }, { rating: 4 }])).toContain('3.0/5 from 2 rated check-ins');
  });
});
