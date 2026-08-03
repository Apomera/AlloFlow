// Tests for dispro_analyzer_module.js — the Disproportionality Analyzer.
//
// What's pinned: the metric definitions against hand-worked numbers (risk
// index, risk ratio vs ALL OTHER students, composition), the stability
// flags, the validation rules (unduplicated counts), the paste parser, and
// the CSV export carrying the descriptive-only method note.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let D;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.DisproAnalyzer;
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
  new Function(readFileSync(resolve(process.cwd(), 'dispro_analyzer_module.js'), 'utf8'))();
  D = window.AlloModules.DisproAnalyzer && window.AlloModules.DisproAnalyzer._testing;
  if (!D) throw new Error('DisproAnalyzer did not register');
});

describe('disproCompute — hand-worked example', () => {
  // Classic textbook case: IEP students 120 enrolled / 18 with ODRs,
  // all others 880 enrolled / 44 with ODRs.
  //   risk(IEP)    = 18/120  = 0.15
  //   risk(others) = 44/880  = 0.05
  //   RR(IEP)      = 0.15/0.05 = 3.0
  const groups = [
    { name: 'Students with IEPs', enrollment: 120, students: 18 },
    { name: 'All other students', enrollment: 880, students: 44 },
  ];

  it('computes risk index, risk ratio vs all others, and composition', () => {
    const r = D.disproCompute(groups);
    expect(r.valid).toBe(true);
    const iep = r.rows[0];
    expect(iep.risk).toBeCloseTo(0.15);
    expect(iep.riskOthers).toBeCloseTo(0.05);
    expect(iep.riskRatio).toBeCloseTo(3.0);
    // Composition: 18/62 of outcomes vs 120/1000 of enrollment
    expect(iep.outcomeShare).toBeCloseTo(18 / 62);
    expect(iep.enrollShare).toBeCloseTo(0.12);
    // The complementary row's RR is the reciprocal relationship, not 1/3 —
    // others' risk 0.05 vs IEP risk 0.15 → 1/3.
    expect(r.rows[1].riskRatio).toBeCloseTo(1 / 3);
    expect(r.totals).toEqual({ enrollment: 1000, students: 62 });
  });

  it('is symmetric across group order', () => {
    const r = D.disproCompute([...groups].reverse());
    expect(r.rows[1].riskRatio).toBeCloseTo(3.0);
  });
});

describe('disproCompute — flags and edge cases', () => {
  it('flags small groups and small comparisons at the cell-size floor', () => {
    const r = D.disproCompute([
      { name: 'Tiny', enrollment: 9, students: 2 },
      { name: 'Rest', enrollment: 500, students: 25 },
    ]);
    expect(r.rows[0].flags).toContain('small_group');
    expect(r.rows[0].riskRatio).not.toBe(null); // still computed, just flagged
    const r2 = D.disproCompute([
      { name: 'Big', enrollment: 500, students: 25 },
      { name: 'Tiny rest', enrollment: 9, students: 2 },
    ]);
    expect(r2.rows[0].flags).toContain('small_comparison');
  });

  it('marks RR undefined (not Infinity) when no other student has the outcome', () => {
    const r = D.disproCompute([
      { name: 'A', enrollment: 100, students: 5 },
      { name: 'B', enrollment: 100, students: 0 },
    ]);
    expect(r.rows[0].riskRatio).toBe(null);
    expect(r.rows[0].flags).toContain('zero_comparison_risk');
    // B has zero risk and others have some: RR is a clean 0.
    expect(r.rows[1].riskRatio).toBe(0);
  });

  it('rejects incident counts masquerading as student counts', () => {
    const r = D.disproCompute([
      { name: 'A', enrollment: 50, students: 61 },
      { name: 'B', enrollment: 100, students: 5 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors[0].message).toContain('unduplicated');
  });

  it('ignores blank rows, rejects negatives and non-integers, never throws on junk', () => {
    expect(() => D.disproCompute(null)).not.toThrow();
    expect(() => D.disproCompute([{ name: null, enrollment: {}, students: [] }])).not.toThrow();
    const r = D.disproCompute([
      { name: '', enrollment: '', students: '' },
      { name: 'A', enrollment: -5, students: 1 },
      { name: 'B', enrollment: 10.5, students: 1 },
    ]);
    expect(r.rows.length).toBe(0);
    expect(r.errors.length).toBe(2);
    expect(r.valid).toBe(false);
  });

  it('requires at least two groups to be valid', () => {
    const r = D.disproCompute([{ name: 'Only', enrollment: 100, students: 5 }]);
    expect(r.valid).toBe(false);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].riskOthers).toBe(null); // no comparison population
  });
});

describe('disproParsePaste', () => {
  it('parses comma/tab/semicolon rows, skips headers and garbage, strips quotes', () => {
    const p = D.disproParsePaste(
      'Group,Enrollment,Students\n' +
      '"Students with IEPs",120,18\n' +
      'All others\t880\t44\n' +
      'Hispanic/Latino;95;12\n' +
      'garbage line\n'
    );
    expect(p.groups).toEqual([
      { name: 'Students with IEPs', enrollment: 120, students: 18 },
      { name: 'All others', enrollment: 880, students: 44 },
      { name: 'Hispanic/Latino', enrollment: 95, students: 12 },
    ]);
    expect(p.skipped).toContain('Group,Enrollment,Students');
    expect(p.skipped).toContain('garbage line');
  });

  it('treats comma thousands-separators inside tab-separated rows as column splits (known hazard, surfaced as extra columns)', () => {
    // "1,080" splits on the comma — the parser sees 4 columns and takes the
    // first three. This test documents the behavior so a future fix is a
    // deliberate change, not an accident.
    const p = D.disproParsePaste('All others\t1,080\t44');
    expect(p.groups[0].enrollment).toBe(1);
  });

  it('returns empty on junk input without throwing', () => {
    expect(D.disproParsePaste(null).groups).toEqual([]);
    expect(D.disproParsePaste('').groups).toEqual([]);
  });
});

describe('alternate risk ratio (34 CFR 300.647 pattern)', () => {
  it('computes alt RR from statewide counts against a hand-worked example', () => {
    // Group risk 18/120 = 0.15; statewide all-others 5,000/100,000 = 0.05
    // → alternate RR = 3.0 regardless of the tiny in-district comparison.
    const r = D.disproCompute([
      { name: 'Students with IEPs', enrollment: 120, students: 18 },
      { name: 'Tiny rest', enrollment: 8, students: 1 },
    ], { label: 'Statewide', enrollment: 100000, students: 5000 });
    expect(r.rows[0].flags).toContain('small_comparison');
    expect(r.rows[0].altRiskRatio).toBeCloseTo(3.0);
    expect(r.altComparison.risk).toBeCloseTo(0.05);
  });

  it('rejects invalid alt data silently (no alt column, no crash)', () => {
    for (const bad of [null, {}, { enrollment: '', students: '' }, { enrollment: 100, students: 200 }, { enrollment: -5, students: 1 }]) {
      const r = D.disproCompute([
        { name: 'A', enrollment: 100, students: 5 },
        { name: 'B', enrollment: 100, students: 5 },
      ], bad);
      expect(r.altComparison || null).toBe(null);
      expect(r.rows[0].altRiskRatio == null).toBe(true);
    }
  });
});

describe('disproTrendSeries', () => {
  const mk = (id, date, outcomeLabel, iepStudents) => ({
    id, date, outcomeLabel, title: id,
    groups: [
      { name: 'Students with IEPs', enrollment: 120, students: iepStudents },
      { name: 'All other students', enrollment: 880, students: 44 },
    ],
  });

  it('groups by outcome, sorts by date, and yields RR series', () => {
    const trends = D.disproTrendSeries([
      mk('a2', '2026-06-01', 'ODRs', 12),
      mk('a1', '2025-06-01', 'ODRs', 18),
      mk('b1', '2026-06-01', 'Suspensions', 6), // only one — excluded
    ]);
    expect(trends.length).toBe(1);
    const t = trends[0];
    expect(t.outcomeLabel).toBe('ODRs');
    expect(t.points.map((p) => p.id)).toEqual(['a1', 'a2']);
    expect(t.series['Students with IEPs'][0]).toBeCloseTo(3.0);   // 0.15/0.05
    expect(t.series['Students with IEPs'][1]).toBeCloseTo(2.0);   // 0.10/0.05
  });

  it('leaves gaps for groups missing from a period and reports omitted beyond 8', () => {
    const a1 = mk('a1', '2025-06-01', 'ODRs', 18);
    const a2 = {
      id: 'a2', date: '2026-06-01', outcomeLabel: 'ODRs', title: 'a2',
      groups: [{ name: 'All other students', enrollment: 880, students: 44 },
               { name: 'Brand new group', enrollment: 100, students: 5 }],
    };
    const t = D.disproTrendSeries([a1, a2])[0];
    expect(t.series['Students with IEPs']).toEqual([expect.any(Number), null]);
    const many = ['2025-06-01', '2026-06-01'].map((date, di) => ({
      id: 'm' + di, date, outcomeLabel: 'Many', title: 'm',
      groups: Array.from({ length: 10 }, (_, i) => ({ name: 'G' + i, enrollment: 100, students: 5 + i })),
    }));
    const tm = D.disproTrendSeries(many)[0];
    expect(tm.groups.length).toBe(8);
    expect(tm.omitted).toEqual(['G8', 'G9']);
  });
});

describe('disproResultCsv', () => {
  it('exports rows, totals, and the descriptive-only method note', () => {
    const groups = [
      { name: 'Group, with comma', enrollment: 120, students: 18 },
      { name: 'Others', enrollment: 880, students: 44 },
    ];
    const csv = D.disproResultCsv({ outcomeLabel: 'ODRs', date: '2026-08-03' }, D.disproCompute(groups));
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('risk_ratio_vs_all_others');
    expect(lines[1]).toContain('"Group, with comma"');
    expect(lines[1]).toContain('3.0000');
    expect(csv).toContain('TOTAL,1000,62');
    expect(csv).toContain('34 CFR 300.647');
  });
});
