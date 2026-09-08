import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
let calculate;
beforeAll(() => {
  // Execute the shipped pure calculation, independent of unrelated dashboard UI hooks.
  const source = readFileSync(resolve(process.cwd(), 'student_analytics_module.js'), 'utf8');
  const start = source.indexOf('const calculateStudentStats = data => {');
  const end = source.indexOf('const computeAnomalyFlags =', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  calculate = new Function(source.slice(start, end) + '\nreturn calculateStudentStats;')();
});
describe('Definition Detective completion integration', () => {
  it('reports comparable accuracy across glossary sizes while preserving raw points', () => {
    const data = { gameCompletions: { definitionDetective: [
      { score: 40, correctCount: 4, totalItems: 5 },
      { score: 100, correctCount: 10, totalItems: 10 }
    ] } };
    const stats = calculate(data);
    expect(stats.definitionDetective).toEqual({ initial: 80, best: 100, attempts: 2 });
    expect(stats.gamesPlayed).toBe(2);
    expect(stats.totalActivities).toBe(2);
    expect(data.gameCompletions.definitionDetective[0].score).toBe(40);
  });
  it('handles missing or invalid count metadata without displaying raw points as accuracy', () => {
    const stats = calculate({ gameCompletions: { definitionDetective: [
      { score: 100 }, { correctCount: 1, totalItems: 0 }, { correctCount: NaN, totalItems: 5 }
    ] } });
    expect(stats.definitionDetective).toEqual({ initial: 0, best: 0, attempts: 3 });
  });
  it('keeps existing game statistics intact', () => {
    expect(calculate({ gameCompletions: { memory: [{ score: 70 }] } }).memoryGame).toEqual({ initial: 70, best: 70, attempts: 1 });
    expect(calculate({}).definitionDetective).toBeNull();
  });
  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('offers the game as a glossary learning goal in %s', file => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).toContain("definitionDetective: 'Definition Detective'");
    expect(source).toMatch(/'glossary':\s*\{\s*games:\s*\[[^\]]*'definitionDetective'/);
    expect(source).toContain('definitionDetective: [],');
  });
});

