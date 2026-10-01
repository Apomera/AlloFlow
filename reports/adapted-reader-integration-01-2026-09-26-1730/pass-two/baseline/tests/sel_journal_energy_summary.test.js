import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const src = readFileSync('sel_hub/sel_tool_journal.js', 'utf8');
const start = src.indexOf('  function getWeekBounds(');
const end = src.indexOf('  function getMonthDays(', start);
const { recordedEnergy, getWeeklySummary } = new Function(src.slice(start, end) + '; return { recordedEnergy, getWeeklySummary };')();
const entries = energies => energies.map(energy => ({ timestamp: Date.now(), mood: 3, energy, triggers: [] }));

describe('Journal optional energy summaries', () => {
  it('keeps an entirely unanswered week unrecorded', () => {
    const result = getWeeklySummary(entries([null, undefined, null]));
    expect(result).toMatchObject({ count: 3, avgEnergy: null, energyCount: 0 });
  });
  it('uses the recorded-rating denominator rather than total check-ins', () => {
    expect(getWeeklySummary(entries([null, 2, 4, undefined]))).toMatchObject({ count: 4, avgEnergy: 3, energyCount: 2 });
  });
  it('retains existing numeric ratings without rewriting history', () => {
    const input = entries([1, 3, 5]);
    const before = JSON.stringify(input);
    expect(getWeeklySummary(input)).toMatchObject({ avgEnergy: 3, energyCount: 3 });
    expect(JSON.stringify(input)).toBe(before);
  });
  it('excludes malformed imported ratings instead of coercing them', () => {
    for (const energy of [null, undefined, '', '4', 0, 6, NaN, Infinity, false]) expect(recordedEnergy({ energy })).toBeNull();
    expect(getWeeklySummary(entries(['5', 0, 6, 4]))).toMatchObject({ avgEnergy: 4, energyCount: 1 });
  });
  it('does not include ratings from outside the current week', () => {
    const input = entries([null, null, 2]);
    input.push({ timestamp: Date.now() - 8 * 86400000, mood: 3, energy: 5 });
    expect(getWeeklySummary(input)).toMatchObject({ count: 3, avgEnergy: 2, energyCount: 1 });
  });
  it('retains the existing three-entry summary threshold', () => {
    expect(getWeeklySummary(entries([1, 5]))).toBeNull();
  });
  it('orders imported entries by timestamp before comparing, without mutating them', () => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const input = [5, 1, 4, 2].map((mood, index) => ({ timestamp: now.getTime() + [4000, 1000, 3000, 2000][index], mood }));
    const before = JSON.stringify(input);
    expect(getWeeklySummary(input)).toMatchObject({ trajectory: 'improving', trajectoryLabel: 'Higher later ratings' });
    expect(JSON.stringify(input)).toBe(before);
  });
  it('describes lower and similar ratings without treating them as performance', () => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const make = moods => moods.map((mood, index) => ({ timestamp: now.getTime() + index * 1000, mood }));
    expect(getWeeklySummary(make([5, 4, 2, 1])).trajectoryLabel).toBe('Lower later ratings');
    expect(getWeeklySummary(make([3, 3, 3, 3])).trajectoryLabel).toBe('Similar ratings');
    expect(getWeeklySummary(make([5, 5, 5])).encouragement).toContain('not a grade');
  });
  it('ignores malformed mood records instead of poisoning the summary', () => {
    const input = entries([1, 2, 3]);
    input.push(null, { timestamp: Date.now(), mood: '5' }, { timestamp: Date.now(), mood: 7 });
    expect(getWeeklySummary(input)).toMatchObject({ count: 3, avgMood: 3 });
  });

});
