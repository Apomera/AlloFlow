// Lane CAREER: Career Pathways, Maine Welding Ecosystem, Welder Career Stories.
// Pins the earnings + debt model, the single pay band the three modules quote,
// the credential sequencing checker, the branching roadmap arithmetic, the
// career-story timelines, deterministic Find-Your-Fit ties, untrusted saved
// state, and that every new state renders its own content.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const readSrc = () => readFileSync(resolve(process.cwd(), SRC), 'utf8');
const core = () => window.__WeldLabCore;
const render = (state) => renderTool('weldLab', { weldLab: Object.assign({}, state) });
const text = (html) => html.replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');
const slice = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i); return (i < 0 || j < 0) ? '' : s.slice(i, j); };
const careerRegions = () => {
  const s = readSrc();
  return [
    slice(s, '// MODULE 8: CAREER PATHWAYS', '// MODULE 9: UNDERWATER WELDING'),
    slice(s, '// MODULE 18: MAINE WELDING ECOSYSTEM', '// MODULE 19: SAFETY + HEALTH DEEP-DIVE'),
    slice(s, '// MODULE 21: WELDER CAREER STORIES', '// overlay so the toast can appear')
  ];
};

beforeEach(() => {
  // A leftover save slot or localStorage entry makes the tool hydrate badges,
  // which writes through the harness's two-argument update() and drops the
  // render back to the menu, so every assertion below would test the menu.
  try { delete window.__alloflowWeldLab; } catch (e) { window.__alloflowWeldLab = undefined; }
  try { localStorage.clear(); } catch (e) {}
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

describe('earnings + debt model', () => {
  it('uses the standard amortised payment, with the 0% and $0 edge cases', () => {
    const { car2LoanPayment } = core();
    // 10,000 at 6% over 10 years: 600 / (1 - 1.06^-10) = 1,358.68
    expect(car2LoanPayment(10000, 6, 10)).toBeCloseTo(1358.68, 2);
    expect(car2LoanPayment(12000, 0, 10)).toBeCloseTo(1200, 10);
    expect(car2LoanPayment(0, 6, 10)).toBe(0);
  });

  it('borrows each tuition year and grows it at the loan rate until graduation', () => {
    const { car2Earnings } = core();
    const r = car2Earnings({ tuition: 10000, years: 2, wage: 20, raise: 0, hourly: false }, { loan: 5 });
    // (10,000 x 1.05 + 10,000) x 1.05 = 21,525
    expect(r.debt).toBeCloseTo(21525, 6);
    expect(r.borrowed).toBe(20000);
    expect(r.payment).toBeCloseTo(2787.59, 2);
    expect(r.interest).toBeCloseTo(2787.586 * 10 - 20000, 1);
    expect(r.schoolYears).toBe(2);
    // No pay in school; the first working year is age 20.
    expect(r.rows[0].net).toBe(0);
    expect(r.rows[1].net).toBe(0);
    expect(r.rows[2].age).toBe(20);
    expect(r.rows[2].gross).toBeCloseTo(20 * 2080, 6);
    expect(r.rows[2].net).toBeCloseTo(20 * 2080 - 2787.586, 2);
  });

  it('pays overtime at 1.5x on hourly paths only, and compounds raises', () => {
    const { car2Earnings, car2CumAt } = core();
    const hourly = car2Earnings({ tuition: 0, years: 0, wage: 20, raise: 0, hourly: true }, { ot: 5, loan: 6 });
    // 20 x 2,080 + 1.5 x 20 x 5 x 52 = 41,600 + 7,800
    expect(hourly.rows[0].gross).toBeCloseTo(49400, 6);
    expect(car2CumAt(hourly, 20)).toBeCloseTo(98800, 6);
    const salaried = car2Earnings({ tuition: 0, years: 0, wage: 20, raise: 0, hourly: false }, { ot: 5, loan: 6 });
    expect(salaried.rows[0].gross).toBeCloseTo(41600, 6);
    const raised = car2Earnings({ tuition: 0, years: 0, wage: 20, raise: 10, hourly: false }, { ot: 0, loan: 0 });
    // (20 + 22 + 24.2) x 2,080
    expect(car2CumAt(raised, 21)).toBeCloseTo(137696, 4);
    // Interpolates between whole years.
    expect(car2CumAt(raised, 18.5)).toBeCloseTo(20 * 2080 / 2, 6);
  });

  it('finds where two lines swap order, and ignores ties while both are still at $0', () => {
    const { car2Crossings } = core();
    const pts = (vals) => vals.map((v, i) => ({ age: 18 + i, cum: v }));
    const x = car2Crossings(pts([0, -10, -5, 5, 20]), pts([0, 0, 0, 0, 0]));
    expect(x).toHaveLength(1);
    expect(x[0].age).toBeCloseTo(20.5, 10);
    expect(x[0].leader).toBe('a');
    expect(car2Crossings(pts([0, 5, 9, 12]), pts([0, 1, 2, 3]))).toEqual([]);
    expect(car2Crossings(pts([0, 0, 0, 10]), pts([0, 0, 0, 5]))).toEqual([]);
    // Touching for a year and pulling apart again on the same side is not a crossing.
    expect(car2Crossings(pts([0, 5, 3, 6]), pts([0, 3, 3, 4]))).toEqual([]);
    const back = car2Crossings(pts([0, 5, 1]), pts([0, 3, 3]));
    expect(back).toHaveLength(1);
    expect(back[0].leader).toBe('b');
  });

  it('gives the representative defaults their documented results', () => {
    const { car2EarnAll, car2LeaderAt } = core();
    const all = car2EarnAll(null);
    // 12,000 a year for 4 years at 6.5%: 12,000 x (1.065^4 + 1.065^3 + 1.065^2 + 1.065)
    expect(all.degree.debt).toBeCloseTo(56323.69, 1);
    expect(all.apprentice.debt).toBe(0);
    expect(car2LeaderAt(all, 25).id).toBe('apprentice');
    const ca = all.crossings.find((c) => c.a === 'college' && c.b === 'apprentice');
    expect(ca.list.length).toBe(1);
    expect(ca.list[0].age).toBeGreaterThan(34);
    expect(ca.list[0].age).toBeLessThan(35);
    expect(all.crossings.find((c) => c.a === 'degree' && c.b === 'apprentice').list).toEqual([]);
  });

  it('normalises a hostile saved explorer state instead of trusting it', () => {
    const { car2NormEarn, CAR2_EARN_DEFAULTS } = core();
    const n = car2NormEarn({ apprentice: { wage: 'x', years: -5, tuition: 1e9 }, college: 'nope', ot: 1e9, loan: 'abc' });
    expect(n.apprentice.wage).toBe(CAR2_EARN_DEFAULTS.apprentice.wage);
    expect(n.apprentice.years).toBe(0);
    expect(n.apprentice.tuition).toBe(60000);
    expect(n.college).toEqual(CAR2_EARN_DEFAULTS.college);
    expect(n.ot).toBe(25);
    expect(n.loan).toBe(CAR2_EARN_DEFAULTS.loan);
    expect(car2NormEarn([1, 2])).toEqual(car2NormEarn(null));
  });
});

describe('one first-cert pay band across the three career modules', () => {
  it('derives the band from CAR2_PAY', () => {
    const { CAR2_PAY, car2RateText, car2YearText } = core();
    expect(CAR2_PAY.firstCert).toEqual({ lo: 22, hi: 26 });
    expect(car2RateText(CAR2_PAY.firstCert)).toBe('$22-26/hr');
    expect(car2YearText(CAR2_PAY.firstCert)).toBe('$46-54K');
    expect(car2YearText(CAR2_PAY.helper)).toBe('$37-46K');
  });

  it('shows the same band in Career Pathways, the Maine roadmap and Career Stories', () => {
    const cp = text(render({ view: 'careerPaths', cp_view: 'overview' }));
    expect(cp).toContain('$46-54K');
    expect(cp).toContain('about $22-26/hr ($46-54K a year before overtime) at age 19');
    const lad = text(render({ view: 'careerPaths', cp_view: 'ladder', car2_lad_ref: true }));
    expect(lad).toContain('First job with this cert: about $22-26/hr ($46-54K a year)');
    const me = text(render({ view: 'maineEcosystem', me_mode: 'roadmap', me_road_path: 'emcc_boatyard' }));
    expect(me).toContain('$22-26/hr start');
    expect(me).toContain('Annual $46-54K. Most yards include healthcare.');
    const cs = text(render({ view: 'careerStories', cs_mode: 'browse' }));
    expect(cs).toContain('a first job with an AWS D1.1 cert pays about $22-26/hr ($46-54K a year before overtime)');
  });

  it('no longer quotes the contradictory first-job figures anywhere in the career modules', () => {
    const all = careerRegions().join('\n');
    expect(all.length).toBeGreaterThan(50000);
    expect(all).not.toMatch(/\$55-80K/);
    expect(all).not.toMatch(/\$50-70K job/);
    expect(all).not.toMatch(/TIG or GTAW/);
    expect(all).not.toMatch(/Pension begins vesting at 5 years/);
  });

  it('keeps the BIW step-1 rate inside the band and the ladder tiers on the band data', () => {
    const { CAR2_PAY } = core();
    const me = careerRegions()[1];
    const m = /Entry welder \(Pay Step 1\) ~\$(\d+)-(\d+)\/hr/.exec(me);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(CAR2_PAY.firstCert.lo);
    expect(Number(m[2])).toBeLessThanOrEqual(CAR2_PAY.firstCert.hi);
    const lad = text(render({ view: 'careerPaths', cp_view: 'ladder', car2_lad_ref: true }));
    expect(lad).toContain('$18-22/hr · ~$37-46K/yr');
    expect(lad).toContain('$22-32/hr · ~$46-67K/yr');
    expect(lad).toContain('$32-45/hr · ~$67-94K/yr');
    expect(lad).toContain('$60-110K / yr typical');
  });
});

describe('credential sequencing checker', () => {
  it('accepts the realistic order and explains every step', () => {
    const { car2CheckLadder, CAR2_LADDER } = core();
    const r = car2CheckLadder(CAR2_LADDER);
    expect(r.correct).toBe(true);
    expect(r.inPlace).toBe(6);
    expect(r.wrongPairs).toEqual([]);
    const html = text(render({ view: 'careerPaths', cp_view: 'ladder', car2_ladder: CAR2_LADDER.slice(), car2_lad_chk: true }));
    expect(html).toContain('✓ A realistic order.');
    expect(html).toContain('passing 3G and 4G together covers every plate position');
  });

  it('names each misordered neighbour pair in the starting order', () => {
    const { car2CheckLadder, CAR2_LADDER_START } = core();
    const r = car2CheckLadder(CAR2_LADDER_START);
    expect(r.correct).toBe(false);
    expect(r.inPlace).toBe(1);
    expect(r.wrongPairs).toEqual([
      { first: 'cwi', second: 'd11' }, { first: 'scwi', second: 'sense' }, { first: 'cwiElig', second: 'pipe6g' }]);
    const html = text(render({ view: 'careerPaths', cp_view: 'ladder', car2_lad_chk: true }));
    expect(html).toContain('1 of 6 are in the right place');
    expect(html).toContain('“CWI — Certified Welding Inspector” is above “AWS D1.1 structural plate cert (3G + 4G)”, but it comes later.');
  });

  it('flags exactly the swapped pair, moves items, and rejects a bad saved list', () => {
    const { car2CheckLadder, car2MoveItem, car2NormLadder, CAR2_LADDER, CAR2_LADDER_START } = core();
    const swapped = car2MoveItem(CAR2_LADDER, 2, 3);
    expect(swapped).toEqual(['sense', 'd11', 'cwiElig', 'pipe6g', 'cwi', 'scwi']);
    expect(car2CheckLadder(swapped).wrongPairs).toEqual([{ first: 'cwiElig', second: 'pipe6g' }]);
    expect(car2MoveItem(CAR2_LADDER, 0, 9)).toEqual(CAR2_LADDER);
    expect(car2NormLadder(['cwi', 'cwi', 'd11', 'sense', 'scwi', 'pipe6g'])).toEqual(CAR2_LADDER_START);
    expect(car2NormLadder('abc')).toEqual(CAR2_LADDER_START);
    expect(car2NormLadder([1, 2, 3, 4, 5, 6])).toEqual(CAR2_LADDER_START);
  });

  it('agrees with the Inspection module on CWI eligibility and the exam fee', () => {
    const { CAR2_CWI_YEARS_HS, CAR2_CWI_YEARS_ASSOC, CAR2_CWI_EXAM_FEE } = core();
    const s = readSrc();
    const m = /(\d+) yr welding \+ HS = qualified; (\d+) yr welding \+ Associate degree in welding tech = qualified\)\. Pass 3-part exam \(\$([\d,]+) fee\)/.exec(s);
    expect(m, 'the Inspection module sentence moved').not.toBeNull();
    expect(Number(m[1])).toBe(CAR2_CWI_YEARS_HS);
    expect(Number(m[2])).toBe(CAR2_CWI_YEARS_ASSOC);
    expect(Number(m[3].replace(',', ''))).toBe(CAR2_CWI_EXAM_FEE);
    const html = text(render({ view: 'careerPaths', cp_view: 'ladder', car2_ladder: core().CAR2_LADDER.slice(), car2_lad_chk: true }));
    expect(html).toContain('5 years with a high-school diploma, or 2 with an associate degree in welding technology');
    expect(html).toContain('$1,150 fee');
  });

  it('keeps the reference ladder hidden until the first check (it would give the order away)', () => {
    const before = text(render({ view: 'careerPaths', cp_view: 'ladder' }));
    expect(before).toContain('opens after your first check');
    expect(before).not.toContain('Welding career ladder — typical progression');
    const after = text(render({ view: 'careerPaths', cp_view: 'ladder', car2_lad_chk: true }));
    expect(after).toContain('Welding career ladder — typical progression');
  });
});

describe('branching Maine roadmap', () => {
  it('makes every total the sum of its year rows, for all 48 combinations', () => {
    const { CAR2_ROAD_STARTS, CAR2_ROAD_D1, CAR2_ROAD_D2, car2RoadTotals, car2YearPay } = core();
    let n = 0;
    CAR2_ROAD_STARTS.forEach((s) => CAR2_ROAD_D1.forEach((a) => CAR2_ROAD_D2.forEach((b) => {
      const t = car2RoadTotals(s, a, b);
      expect(t.steps).toHaveLength(8);
      expect(t.steps.map((st) => st.age)).toEqual([18, 19, 20, 21, 22, 23, 24, 25]);
      const sum = t.steps.reduce((acc, st) => acc + car2YearPay(st), 0);
      expect(t.total).toBe(sum);
      let run = 0;
      t.steps.forEach((st, i) => { run += car2YearPay(st); expect(t.running[i]).toBe(run); });
      n++;
    })));
    expect(n).toBe(48);
  });

  it('computes the year rows from rate x hours, as the rows say', () => {
    const { car2RoadTotals, car2YearPay } = core();
    const t = car2RoadTotals('biw', 'stay', 'keep');
    // 18.50 x 16 wk x 40 h + 23.50 x 26 wk x 40 h
    expect(t.years[0]).toBe(11840 + 24440);
    // 23.50 x 2,080 + 1.5 x 23.50 x 5 h x 52
    expect(t.years[1]).toBe(48880 + 9165);
    expect(car2YearPay({ parts: [{ rate: 20, weeks: 10 }], side: 500, cost: 1000 })).toBe(20 * 400 + 500 - 1000);
    expect(car2RoadTotals('emcc', 'stay', 'keep').years[0]).toBe(-4000);
  });

  it('puts CWI eligibility where the Inspection rules put it, with the exam fee in that year', () => {
    const { car2CwiEligYear, car2RoadTotals } = core();
    expect(car2CwiEligYear('emcc')).toBe(4);   // associate degree + 2 years
    expect(car2CwiEligYear('biw')).toBe(5);    // HS diploma + 5 years
    const e = car2RoadTotals('emcc', 'stay', 'cwi');
    expect(e.creds).toContain('cwi');
    expect(e.creds).not.toContain('cawi');
    expect(e.steps[4].cost).toBe(2000 + 1150);
    const b = car2RoadTotals('biw', 'stay', 'cwi');
    expect(b.creds.indexOf('cawi')).toBeLessThan(b.creds.indexOf('cwi'));
    expect(b.steps[4].cost).toBe(2000);
    expect(b.steps[5].cost).toBe(1150);
    expect(b.steps[6].tag).toBe('cwiWork');
    const shop = car2RoadTotals('cte', 'stay', 'shop');
    expect(shop.steps[4].cost).toBe(15000);
    expect(shop.steps[4].parts[0].ot).toBe(0);
  });

  it('lists the trade-offs each choice really makes', () => {
    const { car2RoadTradeoffs } = core();
    expect(car2RoadTradeoffs('ua', 'pipeline', 'keep')).toContain('leaveAppr');
    expect(car2RoadTradeoffs('ua', 'stay', 'keep')).not.toContain('leaveAppr');
    expect(car2RoadTradeoffs('ua', 'stay', 'cwi')).toEqual(expect.arrayContaining(['leaveAppr', 'payCut']));
    // Leaving at 22 means no journeyman payoff, so the two cannot both be listed.
    expect(car2RoadTradeoffs('ua', 'stay', 'cwi')).not.toContain('uaFinish');
    expect(car2RoadTradeoffs('ua', 'stay', 'keep')).toContain('uaFinish');
    expect(car2RoadTradeoffs('ua', 'stay', null)).toContain('uaFinish');
    expect(car2RoadTradeoffs('biw', 'pipeline', 'shop')).toContain('shopTravel');
    expect(car2RoadTradeoffs('cte', 'stay', 'robotics')).not.toContain('payCut');
  });

  it('shows only the years whose decisions are made, then the summary', () => {
    const { car2RoadTotals, car2Money } = core();
    const none = text(render({ view: 'maineEcosystem', me_mode: 'roadmap', me_road_path: 'biw_internal' }));
    expect(none).toContain('Decision 1 — age 20');
    expect(none).not.toContain('Decision 2 — age 22');
    expect(none).toContain(car2Money(car2RoadTotals('biw', null, null).total));
    const one = text(render({ view: 'maineEcosystem', me_mode: 'roadmap', me_road_path: 'biw_internal', car2_road: { d1: 'cianbro' } }));
    expect(one).toContain('Decision 2 — age 22');
    expect(one).not.toContain('Summary: your path against the alternatives');
    const full = text(render({ view: 'maineEcosystem', me_mode: 'roadmap', me_road_path: 'ua_apprentice', car2_road: { d1: 'stay', d2: 'cwi' } }));
    const t = car2RoadTotals('ua', 'stay', 'cwi');
    expect(full).toContain('Summary: your path against the alternatives');
    expect(full).toContain('earned ' + car2Money(t.total) + ' before taxes');
    expect(full).toContain('CAWI (Certified Associate Welding Inspector)');
    expect(full).toContain('Leaving the UA apprenticeship before journey-out');
  });

  it('words the BIW pension vesting consistently with Year 5', () => {
    const html = text(render({ view: 'maineEcosystem', me_mode: 'roadmap', me_road_path: 'biw_internal' }));
    expect(html).toContain('nothing is vested yet: you vest at 5 years of service (Year 5)');
    expect(html).toContain('Pension VESTS');
  });
});

describe('career-story timelines', () => {
  it('has contiguous stages that end at each profile\'s age', () => {
    const { CAR2_PROFILES, car2ProfileProblems } = core();
    expect(CAR2_PROFILES).toHaveLength(14);
    CAR2_PROFILES.forEach((p) => {
      expect(car2ProfileProblems(p), p.id).toEqual([]);
    });
    expect(car2ProfileProblems({ id: 'x', age: 30, segs: [{ from: 18, to: 20 }, { from: 21, to: 29 }] }))
      .toEqual(['gap or overlap before segment 2', 'last segment ends at 29, not age 30']);
  });

  it('makes Mike\'s BIW years add up: start year + years = retirement year', () => {
    const { CAR2_PROFILES, CAR2_STORY_YEAR } = core();
    const mike = CAR2_PROFILES.find((p) => p.id === 'mike');
    const born = CAR2_STORY_YEAR - mike.age;
    const biw = mike.segs[0];
    expect(born + biw.from).toBe(1988);
    expect(born + biw.from + (biw.to - biw.from)).toBe(born + biw.to);
    expect(born + biw.to).toBe(2023);
    expect(biw.to - biw.from).toBe(35);
    const html = text(render({ view: 'careerStories', cs_mode: 'browse', cs_sel: 9 }));
    expect(html).toContain('35 yr at BIW (started 1988, at age 20) → retired on his BIW pension at 55 (2023) → teaching CTE since 2023');
    expect(html).toContain('BIW for 35 years');
    expect(html).not.toContain('30 yr at BIW');
  });

  it('has Jamal sit the CAWI first and reach CWI eligibility only after 5 years', () => {
    const { CAR2_PROFILES, CAR2_CWI_YEARS_HS } = core();
    const j = CAR2_PROFILES.find((p) => p.id === 'jamal');
    const firstWeld = j.segs.find((s) => s.kind === 'weld').from;
    expect(firstWeld + CAR2_CWI_YEARS_HS).toBeLessThanOrEqual(j.age);
    const html = text(render({ view: 'careerStories', cs_mode: 'browse', cs_sel: 4 }));
    expect(html).toContain('passed the CAWI (Certified Associate Welding Inspector) at 22 → CWI-eligible at 23, after 5 years of welding work');
    expect(html).not.toMatch(/CWI exam at 22/);
  });

  it('only quotes ages and durations the timeline data contains', () => {
    const { CAR2_PROFILES, CAR2_CWI_YEARS_HS, CAR2_BOILER_YEARS } = core();
    CAR2_PROFILES.forEach((p, i) => {
      const raw = render({ view: 'careerStories', cs_mode: 'browse', cs_sel: i });
      const html = text(raw);
      const path = (/ Path (.*?) Timeline: age, stage/.exec(html) || [])[1];
      expect(path, p.id + ' path not found').toBeTruthy();
      const ages = new Set();
      const durs = new Set([p.age - p.segs[0].from, CAR2_CWI_YEARS_HS]);
      p.segs.forEach((s) => { ages.add(s.from); ages.add(s.to); durs.add(s.to - s.from); });
      ages.add(p.segs[0].from + CAR2_CWI_YEARS_HS);
      [...path.matchAll(/\bat (?:age )?(\d{2})\b/g)].forEach((m) => expect(ages.has(Number(m[1])), p.id + ': age ' + m[1]).toBe(true));
      [...path.matchAll(/\b(\d{1,2}) (?:yr|years)\b/g)].forEach((m) => expect(durs.has(Number(m[1])), p.id + ': ' + m[0]).toBe(true));
      expect(raw).toContain('aria-label="Career timeline for ' + html.match(/ ([A-Z][a-z]+ [A-Z]\.), age /)[1]);
    });
    // Cassidy journeys out "next year": apprenticeship start + its length = age + 1.
    const c = CAR2_PROFILES.find((p) => p.id === 'cassidy');
    expect(c.segs[1].from + CAR2_BOILER_YEARS).toBe(c.age + 1);
  });

  it('quotes each profile\'s current rate from the last stage of its timeline', () => {
    const { CAR2_PROFILES, car2Rate } = core();
    ['marcus', 'sarah', 'diego', 'jamal', 'rebecca', 'kevin', 'cassidy'].forEach((id) => {
      const i = CAR2_PROFILES.findIndex((p) => p.id === id);
      const p = CAR2_PROFILES[i];
      const rate = p.segs[p.segs.length - 1].rate[1];
      const html = text(render({ view: 'careerStories', cs_mode: 'browse', cs_sel: i }));
      expect(html, id).toContain(car2Rate(rate) + '/hr');
    });
  });

  it('compares two profiles on one scale, with stats from the same data', () => {
    const { CAR2_PROFILES, car2ProfileStats, car2MoneyK } = core();
    const html = text(render({ view: 'careerStories', cs_mode: 'compare', car2_cmp: [2, 9] }));
    expect(html).toContain('Diego R., age 41');
    expect(html).toContain('Mike H., age 58');
    expect(html).toContain('Both timelines share one age scale');
    const st = car2ProfileStats(CAR2_PROFILES[2]);
    expect(html).toContain(car2MoneyK(st.cumK * 1000));
    expect(st.schoolYears).toBe(0);
  });
});

describe('Find Your Fit ranking', () => {
  it('breaks equal scores by closeness, then alphabetically, and says which rule decided', () => {
    const { car2RankFit, CAR2_PROFILES } = core();
    const r = car2RankFit(CAR2_PROFILES, { want: 'steady', school: 'cc', place: 'big' });
    expect(r.slice(0, 5).map((x) => x.id)).toEqual(['rebecca', 'marcus', 'kevin', 'lin', 'sarah']);
    expect(r[0].tieBreak).toBe(null);
    expect(r[1].tieBreak).toBe('closer');
    expect(r[2].tieBreak).toBe('alpha');
    const c = car2RankFit(CAR2_PROFILES, { want: 'creative', school: 'cc', place: 'self' });
    expect(c.slice(0, 2).map((x) => x.id)).toEqual(['patricia', 'rosa']);
    expect(c[0].tieBreak).toBe('alpha');
  });

  it('does not depend on the order the profiles are listed in', () => {
    const { car2RankFit, CAR2_PROFILES } = core();
    const ans = { want: 'top_pay', school: 'fast', place: 'outdoor' };
    const a = car2RankFit(CAR2_PROFILES, ans).map((x) => x.id);
    const b = car2RankFit(CAR2_PROFILES.slice().reverse(), ans).map((x) => x.id);
    expect(b).toEqual(a);
    expect(car2RankFit(CAR2_PROFILES, { want: 'nope' })).toEqual([]);
  });

  it('explains a tie on the results card', () => {
    const html = text(render({ view: 'careerStories', cs_mode: 'fit', cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'big' }));
    expect(html).toContain('Tied on 5 points with Kevin S.; ranked first because its matching tags are more exclusive');
    expect(html).toContain('Tied on 5 points with Lin C., and just as close a fit; listed first alphabetically.');
    expect(html).toContain('How the ranking works');
    expect(html).toContain('match: 7/7');
  });
});

describe('untrusted saved state never crashes a career view', () => {
  const HOSTILE = [42, 'nope', {}, [], null, { a: 1 }, -1, 2.5, '__proto__'];
  it('falls back to a working screen for every hostile value', () => {
    HOSTILE.forEach((v) => {
      expect(text(render({ view: 'careerPaths', cp_view: v })), 'cp_view ' + JSON.stringify(v)).toContain('Tangible result every day');
      expect(text(render({ view: 'careerPaths', cp_view: 'earnings', car2_earn: v, car2_edit: v, car2_pred: v }))).toContain('Step 1 — predict before you look');
      expect(text(render({ view: 'careerPaths', cp_view: 'ladder', car2_ladder: v, car2_lad_chk: v, car2_lad_ref: v }))).toContain('Sequencing task');
      expect(text(render({ view: 'maineEcosystem', me_sect: v, me_mode: v, me_road_path: v, car2_road: v }))).toContain('Maine has one of the densest');
      expect(text(render({ view: 'maineEcosystem', me_mode: 'roadmap', me_road_path: 'cte_smallshop', car2_road: { d1: v, d2: v } }))).toContain('Decision 1 — age 20');
      expect(text(render({ view: 'careerStories', cs_sel: v, cs_mode: v, cs_q_want: v, cs_q_school: v, cs_q_place: v, car2_cmp: v, car2_reflect: v }))).toContain('Timeline: age, stage and representative pay');
      expect(text(render({ view: 'careerStories', cs_mode: 'compare', car2_cmp: [v, v] }))).toContain('Profile A');
    });
  });

  it('trusts a shown prediction only when both picks are valid', () => {
    const { car2NormPred } = core();
    expect(car2NormPred({ a25: 'degree', shown: true }).shown).toBe(false);
    expect(car2NormPred({ a25: 'degree', a35: 'college', shown: true })).toEqual({ a25: 'degree', a35: 'college', shown: true });
    expect(car2NormPred({ a25: 'degree', a35: 'college', shown: 'yes' }).shown).toBe(false);
  });

  it('caps and type-checks the saved reflection and comparison', () => {
    const { car2NormText, car2NormCmp } = core();
    expect(car2NormText({ x: 1 }, 2000)).toBe('');
    expect(car2NormText('a'.repeat(3000), 2000)).toHaveLength(2000);
    expect(car2NormCmp([99, -3], 14)).toEqual([0, 1]);
    expect(car2NormCmp(['5', 7.9], 14)).toEqual([5, 7]);
    [42, { x: 1 }, ['a']].forEach((v) => {
      const html = render({ view: 'careerStories', car2_reflect: v });
      expect(text(html), JSON.stringify(v)).toContain('0 / 2000 characters');
      expect(html).toMatch(/<textarea[^>]*id="car2-reflect"[^>]*><\/textarea>/);
    });
  });
});

describe('every new state renders its own content', () => {
  it('predict step, then the explorer with chart, crossings, table and formulas', () => {
    const pre = render({ view: 'careerPaths', cp_view: 'earnings' });
    expect(pre).toContain('role="radiogroup"');
    expect(text(pre)).toContain('Who has earned the most (after loan payments) by age 25?');
    expect(text(pre)).not.toContain('Break-even points');
    const html = render({ view: 'careerPaths', cp_view: 'earnings', car2_pred: { a25: 'degree', a35: 'college', shown: true } });
    const t = text(html);
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Line chart of cumulative net earnings/);
    expect(t).toContain('✗ Age 25: you picked 4-year degree, but Apprenticeship / straight to work is ahead.');
    expect(t).toContain('✓ Age 35: you picked Community-college welding program, and it is ahead.');
    expect(t).toContain('That lead is small');
    expect(t).toContain('Break-even points');
    expect(t).toContain('College program passes Apprenticeship at about age 34.');
    expect(t).toContain('Loan payment = D × r ÷ (1 − (1 + r)⁻¹⁰)');
    expect(t).toContain('Worked example:');
  });

  it('the explorer table follows the saved sliders', () => {
    const { car2EarnAll, car2CumAt, car2MoneyK } = core();
    const earn = { apprentice: { tuition: 0, years: 0, wage: 30, raise: 2 }, ot: 0, loan: 4 };
    const t = text(render({ view: 'careerPaths', cp_view: 'earnings', car2_earn: earn, car2_edit: 'apprentice', car2_pred: { a25: 'apprentice', a35: 'apprentice', shown: true } }));
    const all = car2EarnAll(earn);
    expect(t).toContain('Net by age 40 ' + car2MoneyK(car2CumAt(all.apprentice, 40)));
    expect(t).toContain('$30/hr (about $62K a year)');
  });

  it('cross-links the three career modules and their neighbours', () => {
    const cp = render({ view: 'careerPaths' });
    ['Maine Welding Ecosystem →', 'Welder Career Stories →', 'Welder Qualification Prep →', 'Welding Inspection (CWI) →', 'Pipe Welding Deep-Dive →', 'Underwater Welding →', 'Robotic + Automated Welding →']
      .forEach((l) => expect(text(cp)).toContain(l));
    expect(text(render({ view: 'maineEcosystem' }))).toContain('Career Pathways →');
    expect(text(render({ view: 'careerStories' }))).toContain('Maine Welding Ecosystem →');
  });

  it('saves and shows the reflection, and keeps Teacher Notes on all three modules', () => {
    const html = render({ view: 'careerStories', car2_reflect: 'I would ask Diego about travel.' });
    expect(html).toMatch(/<textarea[^>]*id="car2-reflect"[^>]*>I would ask Diego about travel\.<\/textarea>/);
    expect(text(html)).toContain('31 / 2000 characters');
    [render({ view: 'careerPaths' }), render({ view: 'maineEcosystem' }), html].forEach((h) => {
      expect(text(h)).toContain('Teacher Notes');
      expect(text(h)).toContain('Watch for these misconceptions');
    });
  });
});

describe('translation keys for this lane', () => {
  it('registers every new key in ui_strings.js with a byte-identical value, one fallback per key', () => {
    const reg = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8')).stem.weldlab;
    const keys = {};
    Object.keys(reg).forEach((k) => { keys['stem.weldlab.' + k] = reg[k]; });
    const src = careerRegions().join('\n');
    const lit = /__alloT\('(stem\.weldlab\.[A-Za-z0-9_]+)',\s*'((?:[^'\\]|\\.)*)'\)/g;
    const seen = {};
    let m;
    while ((m = lit.exec(src))) {
      const fb = new Function("return '" + m[2] + "';")();
      if (seen[m[1]] !== undefined) expect(seen[m[1]], 'two fallbacks for ' + m[1]).toBe(fb);
      seen[m[1]] = fb;
    }
    const mine = Object.keys(seen).filter((k) => /\.car2_|_r2$/.test(k));
    expect(mine.length).toBeGreaterThan(200);
    mine.forEach((k) => expect(keys[k], 'not registered in ui_strings.js: ' + k).toBe(seen[k]));
  });
});
