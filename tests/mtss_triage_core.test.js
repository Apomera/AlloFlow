// Tests for mtss_triage_module.js — MTSS Triage (Leadership Hub capstone).
//
// Pinned: tier boundaries in BOTH directions with "at the cut = less
// intensive" (a screener at benchmark must not flag a student), cut-point
// sanity validation, board dedup/sort, the window-over-window join
// (movement vs score-improvement are different facts; higher-better vs
// lower-better invert the latter), sibling-count junk tolerance, and the
// CSV carrying the team-review disclaimer.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let M;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.MtssTriage;
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
  new Function(readFileSync(resolve(process.cwd(), 'mtss_triage_module.js'), 'utf8'))();
  M = window.AlloModules.MtssTriage && window.AlloModules.MtssTriage._testing;
  if (!M) throw new Error('MtssTriage did not register');
});

const HB = { higherBetter: true, tier2Cut: 40, tier3Cut: 20 };   // e.g. ORF
const LB = { higherBetter: false, tier2Cut: 10, tier3Cut: 20 };  // e.g. risk scale

describe('mtssTierOf — boundaries both directions', () => {
  it('higher-is-better: at the benchmark cut = Tier 1; at the intensive cut = Tier 2', () => {
    expect(M.mtssTierOf(40, HB)).toBe(1); // at benchmark -> NOT flagged
    expect(M.mtssTierOf(39.9, HB)).toBe(2);
    expect(M.mtssTierOf(20, HB)).toBe(2); // at intensive cut -> less intensive side
    expect(M.mtssTierOf(19.9, HB)).toBe(3);
  });

  it('lower-is-better mirrors exactly', () => {
    expect(M.mtssTierOf(10, LB)).toBe(1);
    expect(M.mtssTierOf(10.1, LB)).toBe(2);
    expect(M.mtssTierOf(20, LB)).toBe(2);
    expect(M.mtssTierOf(20.1, LB)).toBe(3);
  });

  it('null on junk score or cuts', () => {
    expect(M.mtssTierOf(NaN, HB)).toBe(null);
    expect(M.mtssTierOf(30, {})).toBe(null);
  });
});

describe('mtssValidateCuts', () => {
  it('rejects mis-ordered cuts per direction, with direction-specific messages', () => {
    expect(M.mtssValidateCuts(HB)).toBe(null);
    expect(M.mtssValidateCuts(LB)).toBe(null);
    expect(M.mtssValidateCuts({ higherBetter: true, tier2Cut: 20, tier3Cut: 40 })).toContain('BELOW');
    expect(M.mtssValidateCuts({ higherBetter: false, tier2Cut: 20, tier3Cut: 10 })).toContain('ABOVE');
    expect(M.mtssValidateCuts({ higherBetter: true, tier2Cut: '', tier3Cut: 20 })).toContain('both');
  });
});

describe('mtssBoard', () => {
  it('tiers, dedups by code, worst-first within a tier, never throws on junk', () => {
    const ds = { cutpoints: HB, rows: [
      { code: 'JD', score: 45 }, { code: 'MR', score: 25 }, { code: 'AL', score: 12 },
      { code: 'ZZ', score: 18 }, { code: 'MR', score: 99 }, // duplicate -> invalid
      { code: '', score: 30 }, { code: 'NN', score: NaN },
    ] };
    const b = M.mtssBoard(ds);
    expect(b.tiers[1].map((r) => r.code)).toEqual(['JD']);
    expect(b.tiers[2].map((r) => r.code)).toEqual(['MR']);
    expect(b.tiers[3].map((r) => r.code)).toEqual(['AL', 'ZZ']); // worst score leads
    expect(b.invalid.length).toBe(3);
    expect(b.total).toBe(4);
    expect(() => M.mtssBoard(null)).not.toThrow();
  });
});

describe('mtssProgress', () => {
  const win = (rows) => ({ cutpoints: HB, rows });

  it('joins by code, computes delta/movement, and reports unmatched codes', () => {
    const p = M.mtssProgress(
      win([{ code: 'JD', score: 15 }, { code: 'MR', score: 35 }, { code: 'GONE', score: 50 }]),
      win([{ code: 'JD', score: 22 }, { code: 'MR', score: 30 }, { code: 'NEW', score: 44 }])
    );
    const jd = p.joined.find((j) => j.code === 'JD');
    expect(jd.delta).toBe(7);
    expect(jd.improvedScore).toBe(true);
    expect(jd.fromTier).toBe(3);
    expect(jd.toTier).toBe(2);
    expect(jd.movement).toBe('less_intensive');
    const mr = p.joined.find((j) => j.code === 'MR');
    expect(mr.improvedScore).toBe(false);
    expect(mr.movement).toBe('same'); // 35 -> 30 both Tier 2
    expect(p.onlyA).toEqual(['GONE']);
    expect(p.onlyB).toEqual(['NEW']);
    expect(p.summary).toEqual({ joined: 2, lessIntensive: 1, moreIntensive: 0, same: 1, improvedScore: 1 });
  });

  it('lower-is-better inverts score improvement', () => {
    const mk = (rows) => ({ cutpoints: LB, rows });
    const p = M.mtssProgress(mk([{ code: 'JD', score: 25 }]), mk([{ code: 'JD', score: 15 }]));
    expect(p.joined[0].delta).toBe(-10);
    expect(p.joined[0].improvedScore).toBe(true);
  });
});

describe('mtssParsePaste', () => {
  it('skips headers (empty numeric cell = NaN, never 0) and garbage', () => {
    const p = M.mtssParsePaste('Code,Score\nJD,42\nAL\t18\ngarbage\nMR;71\nXX,notanumber');
    expect(p.rows).toEqual([{ code: 'JD', score: 42 }, { code: 'AL', score: 18 }, { code: 'MR', score: 71 }]);
    expect(p.skipped).toContain('Code,Score');
    expect(p.skipped).toContain('XX,notanumber');
  });
});

describe('mtssSiblingCounts', () => {
  it('counts sibling-tool records and tolerates junk storage', () => {
    const store = {
      getItem: (k) => ({
        allo_udlwalk_sessions_v1: JSON.stringify([{}, {}]),
        allo_dispro_analyses_v1: 'not json',
        allo_sped_cases_v1: JSON.stringify([{ completedAt: null }, { completedAt: '2026-08-01' }, {}]),
        allo_meetdocs_meetings_v1: null,
      }[k] || null),
    };
    const c = M.mtssSiblingCounts(store);
    expect(c).toEqual({ walkthroughVisits: 2, disproAnalyses: 0, spedOpen: 2, meetings: 0 });
  });
});

describe('mtssCsv', () => {
  it('exports most-intensive-first with cuts context and the team-review disclaimer', () => {
    const ds = { label: 'ORF g3', window: '2026 Fall', cutpoints: HB, rows: [
      { code: 'JD', score: 45 }, { code: 'AL', score: 12 },
    ] };
    const csv = M.mtssCsv(ds);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('student_code,score,suggested_tier');
    expect(lines[1]).toBe('AL,12,3'); // tier 3 first
    expect(csv).toContain('higher is better');
    expect(csv).toContain('team places students using multiple data sources');
  });
});
