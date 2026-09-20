import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('view_submission_inbox_source.jsx', 'utf8');
const start = source.indexOf('function siBuildGradebookSummary(');
const end = source.indexOf('// Keep edits cheap:', start);
if (start < 0 || end < 0) throw Error('Missing gradebook summary helper');
const summarize = Function(source.slice(start, end) + '\nreturn siBuildGradebookSummary;')();
const entry = (nickname, scores, extra = {}) => ({ nickname, grades: Object.fromEntries(scores.map((score, i) => ['q' + i, { score }])), ...extra });

describe('Saved gradebook summaries', () => {
  it('preserves numeric-score filtering, per-entry rounding, and ungraded values', () => {
    const entries = [entry('A', [0, 100, '80', null]), entry('B', [70, 71]), entry('C', [])];
    const result = summarize(entries, false);
    expect(entries.map(e => result.averages.get(e))).toEqual([50, 71, null]);
    expect(result.students).toEqual([]);
  });

  it('averages rounded submission averages rather than weighting by response count', () => {
    const entries = [entry('A', [0, 0, 0]), entry('a', [100]), entry('A', [])];
    const result = summarize(entries, true);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].avgOfAvgs).toBe(50);
    expect(result.students[0].entries).toEqual(entries);
  });

  it('preserves nickname grouping, first display metadata, entry order, latest date, and alphabetical order', () => {
    const entries = [entry('Zoe', [60], { className: 'First class', gradedAt: '2026-09-01' }), entry('Amy', [90]), entry('ZOE', [80], { className: 'Second class', gradedAt: '2026-09-19' })];
    const result = summarize(entries, true);
    expect(result.students.map(s => s.nickname)).toEqual(['Amy', 'Zoe']);
    expect(result.students[1]).toMatchObject({ className: 'First class', avgOfAvgs: 70, lastGraded: '2026-09-19', entries: [entries[0], entries[2]] });
  });

  it('does not mutate saved entries and supports nicknames matching object property names', () => {
    const entries = [entry('__proto__', [90]), entry('constructor', [70]), entry('', [])];
    const before = JSON.stringify(entries);
    entries.forEach(e => { Object.freeze(e.grades); Object.freeze(e); });
    const result = summarize(Object.freeze(entries), true);
    expect(result.students).toHaveLength(3);
    expect(result.students.find(s => s.nickname === '').avgOfAvgs).toBeNull();
    expect(JSON.stringify(entries)).toBe(before);
  });

  it('recomputes averages and groups from a replacement saved snapshot', () => {
    const old = entry('A', [20]);
    const replacement = entry('A', [90]);
    expect(summarize([old], true).students[0].avgOfAvgs).toBe(20);
    expect(summarize([replacement], true).students[0].avgOfAvgs).toBe(90);
    expect(summarize([], true).students).toEqual([]);
  });
});
