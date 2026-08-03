// Tests for udl_walkthrough_module.js — the UDL Walkthrough admin tool.
//
// The panel UI is browser smoke; what IS pinned here are the pure seams the
// dashboard and research claims stand on: no-opportunity NEVER entering a
// denominator, PD signals honoring the min-n floor, agreement math counting
// no_opp as a real (disagreeable) judgment, and the research export staying
// de-identified — codes only, no free text.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let W;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.UdlWalkthrough;
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
  new Function(readFileSync(resolve(process.cwd(), 'udl_walkthrough_module.js'), 'utf8'))();
  W = window.AlloModules.UdlWalkthrough && window.AlloModules.UdlWalkthrough._testing;
  if (!W) throw new Error('UdlWalkthrough did not register');
});

const roster = [
  { id: 't1', code: 'T-01', name: 'Ada Teacher', grade: '3', subject: 'ELA' },
  { id: 't2', code: 'T-02', name: '', grade: '5', subject: '' },
  { id: 't3', code: 'T-03', name: 'Never Visited', grade: '3', subject: '' },
];

const session = (id, teacherId, evidence, extra = {}) => ({
  id, teacherId, date: '2026-08-03', startedAt: 1, durationMin: 8,
  context: { grouping: 'whole', lessonPhase: 'instruction' },
  evidence, studentIndicators: [], summaryNote: '', frameworkVersion: 'udl-3.0',
  ...extra,
});

describe('instrument shape', () => {
  it('has 27 look-fors, 3 per each of 9 guidelines, and 8 student indicators', () => {
    expect(W.UDLWALK_LOOK_FORS.length).toBe(27);
    expect(W.UDLWALK_GUIDELINES.length).toBe(9);
    for (const g of W.UDLWALK_GUIDELINES) {
      const items = W.UDLWALK_LOOK_FORS.filter((lf) => W.udlwalkGuidelineOf(lf.id) === g.id);
      expect(items.length).toBe(3);
    }
    expect(W.UDLWALK_STUDENT_INDICATORS.length).toBe(8);
  });
});

describe('udlwalkAggregate', () => {
  it('excludes no_opp from every denominator but still counts it', () => {
    const agg = W.udlwalkAggregate([
      session('s1', 't1', {
        eng_7_1: { rating: 'observed' },
        eng_7_2: { rating: 'no_opp' },
        eng_7_3: { rating: 'not' },
      }),
    ], roster);
    expect(agg.totals.eng_7.rated).toBe(2);
    expect(agg.totals.eng_7.observed).toBe(1);
    expect(agg.totals.eng_7.noOpp).toBe(1);
    expect(agg.cells.eng_7['3'].rated).toBe(2);
  });

  it('applies the min-n floor to PD signals and sorts worst-first', () => {
    // eng_7: 3 rated, 0 observed (worst). rep_1: 3 rated, all observed.
    // act_4: only 2 rated — below the floor, must NOT appear.
    const sessions = [
      session('s1', 't1', { eng_7_1: { rating: 'not' }, rep_1_1: { rating: 'observed' }, act_4_1: { rating: 'not' } }),
      session('s2', 't1', { eng_7_2: { rating: 'partial' }, rep_1_2: { rating: 'observed' }, act_4_2: { rating: 'not' } }),
      session('s3', 't2', { eng_7_3: { rating: 'not' }, rep_1_3: { rating: 'observed' } }),
    ];
    const agg = W.udlwalkAggregate(sessions, roster);
    const ids = agg.pdSignals.map((s) => s.id);
    expect(ids[0]).toBe('eng_7');
    expect(ids).not.toContain('act_4');
    expect(agg.pdSignals.find((s) => s.id === 'eng_7').rate).toBe(0);
  });

  it('tracks coverage including never-visited teachers, and tolerates junk', () => {
    const agg = W.udlwalkAggregate([session('s1', 't1', { eng_7_1: { rating: 'observed' } })], roster);
    const never = agg.coverage.find((c) => c.teacherId === 't3');
    expect(never.visits).toBe(0);
    const visited = agg.coverage.find((c) => c.teacherId === 't1');
    expect(visited.visits).toBe(1);
    expect(visited.lastDate).toBe('2026-08-03');
    // Unknown look-for ids (future instrument versions) are skipped, not fatal.
    expect(() => W.udlwalkAggregate([session('sx', 't1', { zz_99_9: { rating: 'observed' } })], roster)).not.toThrow();
  });
});

describe('udlwalkAgreement', () => {
  it('counts exact matches only over items both rated; no_opp is a rating', () => {
    const a = session('a', 't1', {
      eng_7_1: { rating: 'observed' },
      eng_7_2: { rating: 'no_opp' },
      rep_1_1: { rating: 'partial' },
      act_4_1: { rating: 'observed' }, // only A rated this
    });
    const b = session('b', 't1', {
      eng_7_1: { rating: 'observed' }, // agree
      eng_7_2: { rating: 'not' },      // disagree (no_opp vs not)
      rep_1_1: { rating: 'partial' },  // agree
    });
    const r = W.udlwalkAgreement(a, b);
    expect(r.bothRated).toBe(3);
    expect(r.agree).toBe(2);
    expect(r.onlyOne).toBe(1);
    expect(r.pct).toBeCloseTo(2 / 3);
    expect(r.disagreements).toEqual([
      expect.objectContaining({ id: 'eng_7_2', a: 'no_opp', b: 'not' }),
    ]);
  });

  it('returns null pct when nothing overlaps', () => {
    const r = W.udlwalkAgreement(session('a', 't1', {}), session('b', 't1', {}));
    expect(r.bothRated).toBe(0);
    expect(r.pct).toBe(null);
    expect(r.kappa).toBe(null);
  });

  it('computes Cohen’s kappa against a hand-worked example', () => {
    // 4 items both rated: A = obs,obs,not,obs; B = obs,obs,not,not.
    // po = 3/4. Marginals A: obs 3/4, not 1/4; B: obs 2/4, not 2/4.
    // pe = (3/4)(2/4) + (1/4)(2/4) = 0.5 → kappa = (0.75-0.5)/(1-0.5) = 0.5.
    const a = session('a', 't1', {
      eng_7_1: { rating: 'observed' }, eng_7_2: { rating: 'observed' },
      eng_7_3: { rating: 'not' }, eng_8_1: { rating: 'observed' },
    });
    const b = session('b', 't1', {
      eng_7_1: { rating: 'observed' }, eng_7_2: { rating: 'observed' },
      eng_7_3: { rating: 'not' }, eng_8_1: { rating: 'not' },
    });
    const r = W.udlwalkAgreement(a, b);
    expect(r.pct).toBeCloseTo(0.75);
    expect(r.kappa).toBeCloseTo(0.5);
  });

  it('kappa is null (not NaN/Infinity) when expected agreement is 1', () => {
    // Both observers rate everything 'observed': po = 1, pe = 1 → undefined.
    const ev = { eng_7_1: { rating: 'observed' }, eng_7_2: { rating: 'observed' } };
    const r = W.udlwalkAgreement(session('a', 't1', ev), session('b', 't1', ev));
    expect(r.pct).toBe(1);
    expect(r.kappa).toBe(null);
  });
});

describe('udlwalkResearchRows — de-identification contract', () => {
  it('exports codes and note PRESENCE, never names or free text', () => {
    const rows = W.udlwalkResearchRows([
      session('s1', 't1', {
        eng_7_1: { rating: 'observed', note: 'Ms. Ada praised Marcus by name' },
        eng_7_2: { rating: null, note: 'unrated — must not export' },
      }, { summaryNote: 'Aaron saw Mrs. Smith do X' }),
    ], roster);
    expect(rows.length).toBe(1); // unrated entries stay home
    const row = rows[0];
    expect(row.teacher_code).toBe('T-01');
    expect(row.note_present).toBe(1);
    const flat = JSON.stringify(rows);
    expect(flat).not.toContain('Ada');
    expect(flat).not.toContain('Marcus');
    expect(flat).not.toContain('Smith');
  });

  it('CSV round-trips headers and escapes commas/quotes', () => {
    const csv = W.udlwalkCsv([{ a: 'plain', b: 'has,comma', c: 'has "quote"' }]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('a,b,c');
    expect(lines[1]).toBe('plain,"has,comma","has ""quote"""');
    expect(W.udlwalkCsv([])).toBe('');
  });
});

describe('udlwalkFeedbackFromSession', () => {
  it('spreads strengths across principles and prefers "not" over "partial" for the consider', () => {
    const s = session('s1', 't1', {
      eng_7_1: { rating: 'observed' },
      eng_8_1: { rating: 'observed' },
      rep_1_1: { rating: 'observed' },
      act_4_1: { rating: 'observed' },
      rep_2_1: { rating: 'partial' },
      act_5_1: { rating: 'not' },
    });
    const fb = W.udlwalkFeedbackFromSession(s);
    expect(fb.strengths.length).toBe(3);
    const principles = new Set(fb.strengths.map((lf) => lf.principle));
    expect(principles.size).toBe(3);
    expect(fb.consider.id).toBe('act_5_1');
    expect(fb.considerRating).toBe('not');
  });

  it('never surfaces no_opp as a consider', () => {
    const fb = W.udlwalkFeedbackFromSession(session('s1', 't1', { eng_7_1: { rating: 'no_opp' } }));
    expect(fb.consider).toBe(null);
  });

  it('prefers an annotated "not" over an earlier bare one (no instrument-order bias)', () => {
    const fb = W.udlwalkFeedbackFromSession(session('s1', 't1', {
      eng_7_1: { rating: 'not' },                                  // first in instrument order, no note
      act_5_1: { rating: 'not', note: 'no second format offered' }, // annotated — must win
    }));
    expect(fb.consider.id).toBe('act_5_1');
  });
});

describe('observer stamping', () => {
  it('research rows carry the observer initials (empty when unstamped)', () => {
    const rows = W.udlwalkResearchRows([
      session('s1', 't1', { eng_7_1: { rating: 'observed' } }, { observer: { initials: 'AP', role: 'specialist' } }),
      session('s2', 't2', { eng_7_1: { rating: 'observed' } }),
    ], roster);
    expect(rows.find((r) => r.session_id === 's1').observer).toBe('AP');
    expect(rows.find((r) => r.session_id === 's2').observer).toBe('');
  });
});
