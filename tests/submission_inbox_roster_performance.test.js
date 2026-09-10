import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';

const source = readFileSync('view_submission_inbox_source.jsx', 'utf8');
const start = source.indexOf('  const rosterStudents =');
const end = source.indexOf('  const savedIdentityForRow =', start);
if (start < 0 || end < 0) throw Error('Roster matcher block missing');
const block = source.slice(start, end);
const matchRoster = rosterKey => Function('rosterKey', 'React', block + '\nreturn rosterMatch;')(rosterKey, { useMemo: fn => fn() });

describe('Submission Inbox indexed roster matching', () => {
  it('preserves exact, case-insensitive, fuzzy, unknown and missing-name results', () => {
    const match = matchRoster({ students: { 'Calm Otter': '', 'Bright Fox': 'group-a', 'Élodie': '', '你好': '' } });
    expect(match('Calm Otter')).toEqual({ kind: 'exact', name: 'Calm Otter' });
    expect(match('BRIGHT FOX')).toEqual({ kind: 'exact', name: 'Bright Fox' });
    expect(match('calm-otter')).toEqual({ kind: 'fuzzy', name: 'Calm Otter' });
    expect(match('ÉLODIE')).toEqual({ kind: 'exact', name: 'Élodie' });
    expect(match('你好')).toEqual({ kind: 'exact', name: '你好' });
    for (const value of ['New Learner', '', '?', null, undefined]) expect(match(value)).toEqual({ kind: 'unknown' });
    expect(matchRoster(null)('Someone')).toEqual({ kind: 'unknown' });
  });
  it('keeps direct-key precedence and the first case-insensitive match with case collisions', () => {
    const truthy = matchRoster({ students: { 'ALICE': 'group-a', 'alice': 'group-b' } });
    expect(truthy('alice')).toEqual({ kind: 'exact', name: 'alice' });
    expect(truthy('Alice')).toEqual({ kind: 'exact', name: 'ALICE' });
    const empty = matchRoster({ students: { 'ALICE': '', 'alice': '' } });
    expect(empty('alice')).toEqual({ kind: 'exact', name: 'ALICE' });
  });
  it('does not turn ambiguous normalized names into confirmed or fuzzy identities', () => {
    const match = matchRoster({ students: { 'Test Kid': '', 'Test-Kid': '' } });
    expect(match('testkid')).toEqual({ kind: 'unknown' });
    expect(match('TEST KID')).toEqual({ kind: 'exact', name: 'Test Kid' });
  });
  it('refreshes the index when a replacement roster is supplied', () => {
    expect(matchRoster({ students: { 'Old Name': '' } })('old name')).toEqual({ kind: 'exact', name: 'Old Name' });
    const next = matchRoster({ students: { 'New Name': '' } });
    expect(next('old name')).toEqual({ kind: 'unknown' });
    expect(next('new name')).toEqual({ kind: 'exact', name: 'New Name' });
  });
  it('bounds case normalization by roster and query counts instead of scanning for each query', () => {
    const students = Object.fromEntries(Array.from({ length: 400 }, (_, i) => ['Learner ' + i, '']));
    const lowercase = vi.spyOn(String.prototype, 'toLowerCase');
    let results, calls;
    try {
      const match = matchRoster({ students });
      results = Array.from({ length: 800 }, (_, i) => match('LEARNER ' + (i % 400)));
      calls = lowercase.mock.calls.length;
    } finally { lowercase.mockRestore(); }
    expect(results.every(result => result.kind === 'exact')).toBe(true);
    expect(calls).toBe(1600);
  });
});
