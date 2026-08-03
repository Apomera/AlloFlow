// Tests for sped_timelines_module.js — SpEd Timelines (Leadership Hub).
//
// Pinned: the date math a deadline tracker lives or dies on (anniversary
// arithmetic including the Feb 29 anchor, day counting across DST since
// everything is UTC), the prefill rules (60-calendar-day IDEA fallback,
// custom type never prefilled), band ordering, provider rollup, and the
// CSV carrying the verify-against-your-state note.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let S;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.SpedTimelines;
  if (!window.React) {
    window.React = {
      createContext: () => ({}),
      createElement: () => null,
      Fragment: 'Fragment',
      memo: (c) => c,
      useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useContext: () => null,
    };
  }
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'sped_timelines_module.js'), 'utf8'))();
  S = window.AlloModules.SpedTimelines && window.AlloModules.SpedTimelines._testing;
  if (!S) throw new Error('SpedTimelines did not register');
});

describe('date seams', () => {
  it('anniversary keeps month/day and lands Feb 29 on Feb 28 in non-leap years', () => {
    expect(S.spedAnniversary('2026-03-15', 1)).toBe('2027-03-15');
    expect(S.spedAnniversary('2026-03-15', 3)).toBe('2029-03-15');
    expect(S.spedAnniversary('2024-02-29', 1)).toBe('2025-02-28'); // conservative, never later
    expect(S.spedAnniversary('2024-02-29', 4)).toBe('2028-02-29'); // leap-to-leap keeps the 29th
    expect(S.spedAnniversary('garbage', 1)).toBe(null);
    expect(S.spedAnniversary('2026-02-30', 1)).toBe(null); // impossible date rejected
  });

  it('addDays is exact across month/year boundaries (UTC — no DST drift)', () => {
    expect(S.spedAddDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(S.spedAddDays('2026-11-15', 60)).toBe('2027-01-14'); // crosses a US DST change
    expect(S.spedAddDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('defaultDue: 60-day IDEA fallback (configurable), anniversaries, never for custom', () => {
    expect(S.spedDefaultDue('initial_eval', '2026-09-01', 60)).toBe('2026-10-31');
    expect(S.spedDefaultDue('initial_eval', '2026-09-01', '45')).toBe('2026-10-16');
    expect(S.spedDefaultDue('initial_eval', '2026-09-01', 0)).toBe('2026-10-31'); // junk -> fallback 60
    expect(S.spedDefaultDue('annual', '2026-09-01')).toBe('2027-09-01');
    expect(S.spedDefaultDue('triennial', '2026-09-01')).toBe('2029-09-01');
    expect(S.spedDefaultDue('custom', '2026-09-01')).toBe(null);
  });

  it('daysUntil is signed and null-safe', () => {
    expect(S.spedDaysUntil('2026-08-10', '2026-08-03')).toBe(7);
    expect(S.spedDaysUntil('2026-08-01', '2026-08-03')).toBe(-2);
    expect(S.spedDaysUntil('', '2026-08-03')).toBe(null);
  });
});

describe('bands and rollup', () => {
  const TODAY = '2026-08-03';
  const mk = (id, dueDate, extra) => ({ id, code: id.toUpperCase(), type: 'annual', provider: 'AP', keyDate: '', dueDate, completedAt: null, ...extra });

  it('bands at the documented thresholds; done and undated are their own bands', () => {
    expect(S.spedBand(mk('a', '2026-08-02'), TODAY)).toBe('overdue');
    expect(S.spedBand(mk('b', '2026-08-03'), TODAY)).toBe('urgent');  // due today = 0 days
    expect(S.spedBand(mk('c', '2026-08-17'), TODAY)).toBe('urgent');  // exactly 14
    expect(S.spedBand(mk('d', '2026-08-18'), TODAY)).toBe('soon');    // 15
    expect(S.spedBand(mk('e', '2026-09-02'), TODAY)).toBe('soon');    // exactly 30
    expect(S.spedBand(mk('f', '2026-09-03'), TODAY)).toBe('ok');      // 31
    expect(S.spedBand(mk('g', ''), TODAY)).toBe('undated');
    expect(S.spedBand(mk('h', '2026-08-02', { completedAt: '2026-08-01' }), TODAY)).toBe('done');
  });

  it('rollup sorts most-urgent first and aggregates providers (done excluded from open)', () => {
    const cases = [
      mk('ok1', '2026-10-01'),
      mk('ov1', '2026-07-01'),
      mk('ur1', '2026-08-10', { provider: 'JB' }),
      mk('dn1', '2026-07-15', { completedAt: '2026-07-10', provider: 'JB' }),
    ];
    const r = S.spedRollup(cases, TODAY);
    expect(r.cases.map((c) => c.id)).toEqual(['ov1', 'ur1', 'ok1', 'dn1']);
    expect(r.counts).toEqual({ overdue: 1, urgent: 1, soon: 0, ok: 1, undated: 0, done: 1 });
    const ap = r.byProvider.find((p) => p.provider === 'AP');
    const jb = r.byProvider.find((p) => p.provider === 'JB');
    expect(ap).toEqual({ provider: 'AP', open: 2, overdue: 1, urgent: 0, done: 0 });
    expect(jb).toEqual({ provider: 'JB', open: 1, overdue: 0, urgent: 1, done: 1 });
    // Provider with overdue sorts first.
    expect(r.byProvider[0].provider).toBe('AP');
  });

  it('never throws on junk cases', () => {
    expect(() => S.spedRollup(null, TODAY)).not.toThrow();
    expect(() => S.spedRollup([{}, { dueDate: 'nope' }], TODAY)).not.toThrow();
  });
});

describe('spedCsv', () => {
  it('exports sorted rows with escaping and the verify-your-state note', () => {
    const csv = S.spedCsv([
      { id: 'x', code: 'A, B', type: 'initial_eval', provider: 'AP', keyDate: '2026-09-01', dueDate: '2026-10-31', completedAt: null },
    ], '2026-08-03');
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('student_code');
    expect(lines[1]).toContain('"A, B"');
    expect(lines[1]).toContain('Initial evaluation');
    expect(csv).toContain('verify against your state timeline');
  });
});
