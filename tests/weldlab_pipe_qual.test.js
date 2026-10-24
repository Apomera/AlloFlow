// Lane PIPE: Welder Qualification Prep + Pipe Welding Deep-Dive.
// Pins the qualification table, the pass-count model, the uphill two-halves
// model, the quiz bank/label/reset contract, untrusted saved state, and that
// every new tab renders.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ALL = ['F', 'H', 'V', 'OH'];

const readSrc = () => readFileSync(resolve(process.cwd(), SRC), 'utf8');
// The two modules this lane owns, from the MODULE 13 banner to MODULE 15.
const region = () => {
  const s = readSrc();
  return s.slice(s.indexOf('// MODULE 13: WELDER QUALIFICATION TEST PREP'), s.indexOf('// MODULE 15: ROBOTIC + AUTOMATED WELDING'));
};
const core = () => window.__WeldLabCore;
const render = (state) => renderTool('weldLab', { weldLab: Object.assign({}, state) });
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

beforeEach(() => {
  // A mounted test leaves the host save slot and localStorage behind; either
  // makes the tool hydrate badges on the next SSR render, which writes through
  // the harness's two-argument update() and blanks the view back to the menu.
  try { delete window.__alloflowWeldLab; } catch (e) { window.__alloflowWeldLab = undefined; }
  try { localStorage.clear(); } catch (e) {}
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

describe('AWS D1.1 welder qualification table', () => {
  it('6G covers every pipe butt position but not T-, K-, Y-connections; 6GR adds them', () => {
    const { pipe2Qualifies } = core();
    const g6 = pipe2Qualifies(['pipe6G']);
    expect(g6.pipeGroove).toEqual(ALL);
    expect(g6.plateGroove).toEqual(ALL);
    expect(g6.fillet).toEqual(ALL);
    expect(g6.tyk).toEqual([]);
    expect(pipe2Qualifies(['pipe6GR']).tyk).toEqual(ALL);
  });

  it('only 6GR qualifies tubular T-, K-, Y-connections', () => {
    const { PIPE2_QUAL_TESTS, pipe2Qualifies } = core();
    const withTyk = PIPE2_QUAL_TESTS.filter((t) => pipe2Qualifies([t.id]).tyk.length > 0).map((t) => t.id);
    expect(withTyk).toEqual(['pipe6GR']);
  });

  it('1G plate qualifies flat groove only (fillets F + H; large pipe only)', () => {
    const q = core().pipe2Qualifies(['plate1G']);
    expect(q.plateGroove).toEqual(['F']);
    expect(q.fillet).toEqual(['F', 'H']);
    expect(q.pipeGroove).toEqual([]);
    expect(q.pipeLarge).toEqual(['F']);
  });

  it('4G alone is flat + overhead groove; 3G + 4G together cover every plate position', () => {
    const { pipe2Qualifies } = core();
    const g4 = pipe2Qualifies(['plate4G']);
    expect(g4.plateGroove).toEqual(['F', 'OH']);
    expect(g4.fillet).toEqual(['F', 'H', 'OH']);
    expect(g4.plateGroove).not.toContain('V');
    expect(g4.plateGroove).not.toContain('H');
    const g3 = pipe2Qualifies(['plate3G']);
    expect(g3.plateGroove).toEqual(['F', 'H', 'V']);
    const pair = pipe2Qualifies(['plate3G', 'plate4G']);
    expect(pair.plateGroove).toEqual(ALL);
    expect(pair.fillet).toEqual(ALL);
    expect(pair.pipeGroove).toEqual([]);           // still plate: large pipe only
    expect(pair.pipeLarge).toEqual(ALL);
  });

  it('5G is F/V/OH; 2G + 5G covers all; fillet tests never qualify a groove', () => {
    const { pipe2Qualifies, PIPE2_QUAL_TESTS } = core();
    expect(pipe2Qualifies(['pipe5G']).pipeGroove).toEqual(['F', 'V', 'OH']);
    expect(pipe2Qualifies(['pipe2G', 'pipe5G']).pipeGroove).toEqual(ALL);
    expect(pipe2Qualifies(['fillet3F', 'fillet4F']).fillet).toEqual(ALL);
    PIPE2_QUAL_TESTS.filter((t) => t.group === 'fillet').forEach((t) => {
      const q = pipe2Qualifies([t.id]);
      expect(q.plateGroove, t.id).toEqual([]);
      expect(q.pipeGroove, t.id).toEqual([]);
      expect(q.pipeLarge, t.id).toEqual([]);
    });
  });

  it('a pipe test lifts the large-pipe-only limit for the positions it covers', () => {
    const q = core().pipe2Qualifies(['plate3G', 'pipe1G']);
    expect(q.pipeGroove).toEqual(['F']);
    expect(q.pipeLarge).toEqual(['H', 'V']);
  });

  it('ignores unknown ids instead of throwing', () => {
    const { pipe2Qualifies } = core();
    expect(pipe2Qualifies(['nope', undefined, 7]).any).toBe(false);
    expect(pipe2Qualifies(['nope']).plateGroove).toEqual([]);
  });

  it('gives every scenario exactly one covering answer, and it is the keyed one', () => {
    const { PIPE2_QUAL_SCENARIOS, pipe2Covers } = core();
    expect(PIPE2_QUAL_SCENARIOS.length).toBeGreaterThanOrEqual(4);
    PIPE2_QUAL_SCENARIOS.forEach((s) => {
      expect(s.opts).toHaveLength(4);
      const covering = s.opts.map((o, i) => (pipe2Covers(s.has.concat(o), s.need).ok ? i : -1)).filter((i) => i >= 0);
      expect(covering, s.id).toEqual([s.correct]);
    });
  });
});

describe('pass count model', () => {
  it('uses the documented groove-area formula', () => {
    const { pipe2BandArea } = core();
    const tan = Math.tan(37.5 * Math.PI / 180);
    [0.25, 0.432, 0.719, 1.0].forEach((t) => {
      expect(pipe2BandArea(0, t)).toBeCloseTo(0.125 * t + (t - 0.0625) ** 2 * tan, 10);
    });
  });

  it('never drops a pass as the wall gets thicker', () => {
    const { pipe2GroovePlan } = core();
    let prev = null;
    for (let t = 0.2; t <= 1.0 + 1e-9; t += 0.005) {
      const p = pipe2GroovePlan(t);
      if (prev) {
        expect(p.area, 'area at ' + t.toFixed(3)).toBeGreaterThan(prev.area);
        expect(p.fill, 'fill at ' + t.toFixed(3)).toBeGreaterThanOrEqual(prev.fill);
        expect(p.cap, 'cap at ' + t.toFixed(3)).toBeGreaterThanOrEqual(prev.cap);
        expect(p.total, 'total at ' + t.toFixed(3)).toBeGreaterThanOrEqual(prev.total);
      }
      expect(p.total).toBe(2 + p.fill + p.cap);
      prev = p;
    }
  });

  it('scales from root-hot-cap on thin wall to many fills on 1 in. wall', () => {
    const { pipe2GroovePlan } = core();
    expect(pipe2GroovePlan(0.218).fill).toBe(0);
    expect(pipe2GroovePlan(0.432).fill).toBeGreaterThanOrEqual(2);
    expect(pipe2GroovePlan(1.0).fill).toBeGreaterThan(10);
    expect(pipe2GroovePlan(1.0).fill).toBeGreaterThan(2 * pipe2GroovePlan(0.5).fill);
  });

  it('derives the fill bead from the Bead Lab model rather than a typed number', () => {
    const { pipe2GroovePlan, beadGeometry } = core();
    const b = beadGeometry(24, 150, 6, 'stick', 'steel', 0.5).depArea;
    expect(pipe2GroovePlan(0.5).beadArea).toBeCloseTo(b, 12);
    // and the bead area actually drives the count
    expect(pipe2GroovePlan(0.719, b / 2).fill).toBeGreaterThan(pipe2GroovePlan(0.719, b).fill);
  });

  it('builds root, hot, fills, caps in that order and trusts no saved stack', () => {
    const { pipe2GroovePlan, pipe2PassSequence, pipe2NormStack, pipe2NextPass } = core();
    const plan = pipe2GroovePlan(0.432);
    const seq = pipe2PassSequence(plan);
    expect(seq.slice(0, 2)).toEqual(['root', 'hot']);
    expect(seq.filter((x) => x === 'fill')).toHaveLength(plan.fill);
    expect(seq.slice(-plan.cap).every((x) => x === 'cap')).toBe(true);
    expect(pipe2NextPass(plan, [])).toBe('root');
    expect(pipe2NextPass(plan, ['root'])).toBe('hot');
    expect(pipe2NextPass(plan, ['root', 'hot'])).toBe('fill');
    expect(pipe2NextPass(plan, seq)).toBe('done');
    expect(pipe2NormStack(['root', 'fill', 'fill'], plan)).toEqual(['root']);
    expect(pipe2NormStack('root', plan)).toEqual([]);
    expect(pipe2NormStack({ 0: 'root' }, plan)).toEqual([]);
    expect(pipe2NormStack(seq.concat(['cap', 'cap']), plan)).toEqual(seq);
  });
});

describe('pipe clock and travel', () => {
  it('welds uphill 5G in two halves, each from 6 o\'clock up to 12', () => {
    const up = core().pipe2TravelPlan('uphill');
    expect(up.halves).toHaveLength(2);
    up.halves.forEach((hf) => {
      expect(hf.hours[0]).toBe(6);
      expect(hf.hours[hf.hours.length - 1]).toBe(12);
      expect(hf.from).toBe(6);
      expect(hf.to).toBe(12);
    });
    // opposite sides: one climbs past 9, the other past 3
    expect(up.halves.map((hf) => hf.hours.includes(9))).toEqual([true, false]);
    expect(up.halves.map((hf) => hf.hours.includes(3))).toEqual([false, true]);
    expect(up.together).toBe(false);
  });

  it('runs downhill pipeline technique from 12 to 6 on each side', () => {
    const dn = core().pipe2TravelPlan('downhill');
    expect(dn.halves).toHaveLength(2);
    dn.halves.forEach((hf) => {
      expect(hf.hours[0]).toBe(12);
      expect(hf.hours[hf.hours.length - 1]).toBe(6);
    });
  });

  it('names the gravity zone at each o\'clock', () => {
    const { pipe2ClockZone } = core();
    expect(pipe2ClockZone('5G', 6)).toBe('overhead');
    expect(pipe2ClockZone('5G', 3)).toBe('vertical');
    expect(pipe2ClockZone('5G', 9)).toBe('vertical');
    expect(pipe2ClockZone('5G', 12)).toBe('flat');
    expect(pipe2ClockZone('6G', 6)).toBe('overhead');
    for (let h = 1; h <= 12; h++) expect(pipe2ClockZone('2G', h)).toBe('horizontal');
    expect(pipe2ClockZone('1G', 12)).toBe('rolledTop');
    expect(pipe2ClockZone('1G', 6)).toBe('rolledAway');
    expect(pipe2ClockZone('5G', 'junk')).toBe('overhead');     // junk -> 6 o'clock
    expect(pipe2ClockZone('5G', 24)).toBe('flat');
  });
});

describe('bend test and pay arithmetic', () => {
  it('rejects an open discontinuity only above 1/8 in.', () => {
    const { pipe2BendFails } = core();
    expect(pipe2BendFails(4 / 32)).toBe(false);
    expect(pipe2BendFails(0.125)).toBe(false);
    expect(pipe2BendFails(5 / 32)).toBe(true);
    expect(pipe2BendFails('x')).toBe(false);
  });

  it('pays time-and-a-half after 40 h and adds per diem', () => {
    const p = core().pipe2PayWeek({ rate: 50, hours: 60, perDiem: 130, days: 7, costs: 0, weeks: 26 });
    expect(p.straight).toBe(2000);
    expect(p.ot).toBe(1500);
    expect(p.perDiem).toBe(910);
    expect(p.week).toBe(4410);
    expect(p.projectGross).toBe(114660);
    const q = core().pipe2PayWeek({ rate: 50, hours: 60, perDiem: 130, days: 7, costs: 350, weeks: 26 });
    expect(q.projectNet).toBe((4410 - 350) * 26);
    expect(core().pipe2PayWeek({ rate: 'x', hours: null }).week).toBe(4410); // junk -> defaults
  });
});

describe('Welder Qual Prep quiz', () => {
  const bankSize = () => (region().match(/__alloT\('stem\.weldlab\.pipe2_qz\d\d_q'/g) || []).length;

  it('labels the quiz with the real number of questions', () => {
    const n = bankSize();
    expect(n).toBe(37);
    const html = text(render({ view: 'qualPrep', qp_view: 'quiz' }));
    expect(html).toContain('Practice Quiz (' + n + ' q)');
    expect(html).toContain('Question 1 of ' + n);
    expect(html).not.toContain('(30 q)');
  });

  it('balances the keys of the new questions and scenarios across A-D', () => {
    const r = region();
    const counts = [0, 0, 0, 0];
    const re = /pipe2_qz(\d\d)_d', '(?:[^'\\]|\\.)*'\)\], correct: (\d)/g;
    let m, seen = 0;
    while ((m = re.exec(r))) {
      seen++;
      if (Number(m[1]) >= 32) counts[Number(m[2])]++;
    }
    expect(seen).toBe(37);
    core().PIPE2_QUAL_SCENARIOS.forEach((s) => { counts[s.correct]++; });
    const total = counts.reduce((a, b) => a + b, 0);
    expect(total).toBe(12);
    counts.forEach((c) => expect(c).toBeGreaterThan(0));
    expect(Math.max(...counts) / total).toBeLessThanOrEqual(0.35);
  });

  it('keeps only real answers from a hand-edited project file', () => {
    const { pipe2NormAnswers } = core();
    expect(pipe2NormAnswers({ 0: 1, 1: '2', 2: 1.5, 3: -1, 4: 9, 999: 0, abc: 1 }, [4, 4, 4, 4, 4])).toEqual({ 0: 1 });
    expect(pipe2NormAnswers('junk', [4])).toEqual({});
    expect(pipe2NormAnswers(null, [4])).toEqual({});
    expect(pipe2NormAnswers([2, 'x'], [4, 4])).toEqual({ 0: 2 });
  });

  it('survives hostile qp_ans / qp_quizidx / qp_view without crashing', () => {
    const answers = ['junk', 42, null, [9, 'x', null], { 0: 99, 1: '2', abc: 1, 999: 0, 2: 1.5 }, { __proto__: { 0: 1 } }, true];
    const idxs = ['abc', 1e9, -5, 2.7, {}, null, '3'];
    answers.forEach((qp_ans) => {
      idxs.forEach((qp_quizidx) => {
        ['quiz', 'nope', 7].forEach((qp_view) => {
          ['run', 'summary', 'review', 'zzz'].forEach((pipe2_qpmode) => {
            const html = render({ view: 'qualPrep', qp_view, qp_ans, qp_quizidx, pipe2_qpmode, pipe2_revidx: 'x' });
            expect(html.length, JSON.stringify({ qp_ans, qp_quizidx, qp_view, pipe2_qpmode })).toBeGreaterThan(1000);
          });
        });
      });
    });
    // an out-of-range index falls back to question 1, and junk answers score nothing
    const t = text(render({ view: 'qualPrep', qp_view: 'quiz', qp_quizidx: 500, qp_ans: { 0: 99, 1: 'x' } }));
    expect(t).toContain('Question 1 of 37 · Score 0/0');
  });

  it('counts first answers honestly and offers a review of the misses', () => {
    // Q1 key is B (1): A is a miss; Q2 key is C (2): right.
    const summary = text(render({ view: 'qualPrep', qp_view: 'quiz', pipe2_qpmode: 'summary', qp_ans: { 0: 0, 1: 2 } }));
    expect(summary).toContain('1/37');
    expect(summary).toContain('Review the 1 you missed');
    const review = text(render({ view: 'qualPrep', qp_view: 'quiz', pipe2_qpmode: 'review', qp_ans: { 0: 0, 1: 2 } }));
    expect(review).toContain('Review 1 of 1 (question 1)');
    expect(review).toContain('Your first answer was A');
  });

  it('shows why a picked wrong option is wrong on the new items', () => {
    // Q32 (index 31) key is D; pick A.
    const t = text(render({ view: 'qualPrep', qp_view: 'quiz', qp_quizidx: 31, qp_ans: { 31: 0 } }));
    expect(t).toContain('Why not A:');
    expect(t).toContain('DOWNHILL technique');
  });
});

describe('Reset clears answers and index (mounted)', () => {
  let host, root, latest;
  afterEach(() => { if (root) act(() => root.unmount()); if (host) host.remove(); root = null; host = null; });

  async function mount(initial) {
    const cfg = window.StemLab._registry.weldLab;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ weldLab: initial });
      latest = data;
      const update = (tool, key, val) => setData((prev) => Object.assign({}, prev, { [tool]: Object.assign({}, prev[tool], { [key]: val }) }));
      return cfg.render(makeCtx({ toolData: data, update }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }
  const button = (label) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim().startsWith(label));

  it('wipes qp_ans and returns to question 1', async () => {
    await mount({ view: 'qualPrep', qp_view: 'quiz', qp_quizidx: 2, qp_ans: { 0: 1, 1: 0, 2: 3 } });
    expect(host.textContent).toContain('Question 3 of 37');
    expect(host.textContent).toContain('Score 2/3');   // Q1 key B, Q2 key C, Q3 key D
    const reset = button('↺ Reset quiz');
    expect(reset).toBeTruthy();
    await act(async () => { reset.click(); await Promise.resolve(); });
    expect(latest.weldLab.qp_ans).toEqual({});
    expect(latest.weldLab.qp_quizidx).toBe(0);
    expect(host.textContent).toContain('Question 1 of 37');
    expect(host.textContent).toContain('Score 0/0');
  });

  it('locks the first pick: a second click cannot change the score', async () => {
    await mount({ view: 'qualPrep', qp_view: 'quiz', qp_quizidx: 0, qp_ans: {} });
    const radios = () => Array.from(host.querySelectorAll('[role="radio"]'));
    await act(async () => { radios()[0].click(); await Promise.resolve(); });   // A: wrong (key B)
    await act(async () => { radios()[1].click(); await Promise.resolve(); });   // ignored
    expect(latest.weldLab.qp_ans).toEqual({ 0: 0 });
    expect(host.textContent).toContain('Score 0/1');
  });

  it('places passes only in order and explains a wrong one', async () => {
    await mount({ view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: 0.432 });
    await act(async () => { button('＋ Fill').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Start at the bottom');
    await act(async () => { button('＋ Root').click(); await Promise.resolve(); });
    await act(async () => { button('＋ Fill').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('wagon tracks');
    expect(latest.weldLab.pipe2_stack).toEqual(['root']);
  });
});

describe('every new tab renders', () => {
  const cases = [
    [{ view: 'qualPrep', qp_view: 'overview' }, ['6GR — 6G with a restriction ring', 'pair it with 3G']],
    [{ view: 'qualPrep', qp_view: 'matrix', pipe2_qtest: 'plate4G' }, ['What does each test qualify?', 'Alone, 4G covers flat + overhead grooves', 'Which test should this welder take?']],
    [{ view: 'qualPrep', qp_view: 'matrix', pipe2_qtest: 'pipe6GR', pipe2_scnidx: 1, pipe2_scn: { 1: 0 } }, ['CJP T-, K- and Y-connections', 'leaves out']],
    [{ view: 'qualPrep', qp_view: 'bend', pipe2_bend: 'root', pipe2_flaw: 6 }, ['The guided bend test', 'Reject: 3/16 in.']],
    [{ view: 'qualPrep', qp_view: 'bend', pipe2_bend: 'side', pipe2_flaw: 2 }, ['Accept on this rule: 1/16 in.']],
    [{ view: 'qualPrep', qp_view: 'quiz' }, ['Question 1 of 37']],
    [{ view: 'pipeWelding', pipe_sect: 'overview' }, ['Why pipe is harder than plate', 'How pipe welds are inspected']],
    [{ view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '5G', pipe2_hour: 6 }, ['Pipe Position Explorer', 'Overhead (bottom of the pipe)', 'two halves']],
    [{ view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '6GR', pipe2_hour: 3 }, ['restriction ring', 'T-, K- and Y-connections']],
    [{ view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '1G', pipe2_hour: 7 }, ['Not welded here in 1G']],
    [{ view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '2G', pipe2_hour: 9, pipe2_chal: 1 }, ['Check 2 of 3', 'Challenge on']],
    [{ view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: 0.719, pipe2_stack: ['root', 'hot', 'fill'] }, ['Passes placed: 3 of', 'How the pass count is estimated']],
    [{ view: 'pipeWelding', pipe_sect: 'updown', pipe2_dir: 'uphill' }, ['Half 1 (6 → 9 → 12): 0%', 'UPHILL']],
    [{ view: 'pipeWelding', pipe_sect: 'updown', pipe2_dir: 'downhill' }, ['Both halves (12 → 3 → 6', 'stovepipe']],
    [{ view: 'pipeWelding', pipe_sect: 'pipeline' }, ['Travel-pay calculator', '$114,660', 'Your turn']],
    [{ view: 'pipeWelding', pipe_sect: 'orbital' }, ['Orbital welding']],
    [{ view: 'pipeWelding', pipe_sect: 'specialty' }, ['Nuclear pipe welder']],
  ];
  cases.forEach(([state, needles]) => {
    it(JSON.stringify(state), () => {
      const t = text(render(state));
      needles.forEach((n) => expect(t, n).toContain(n));
    });
  });

  it('survives hostile pipe state', () => {
    const bad = [
      { pipe_sect: 'zzz', pipe2_pos: 7, pipe2_hour: 'x', pipe2_chal: 'q', pipe2_dir: {} },
      { pipe_sect: 'passes', pipe2_wall: 'abc', pipe2_stack: 'root' },
      { pipe_sect: 'passes', pipe2_wall: 99, pipe2_stack: [1, 2, null] },
      { pipe_sect: 'positions', pipe2_hour: -40, pipe2_chal: 99 },
      { pipe_sect: 'pipeline', pipe2_rate: 'x', pipe2_hrs: null, pipe2_weeks: -3, pipe2_costs: 1e9 },
    ];
    bad.forEach((s) => {
      const html = render(Object.assign({ view: 'pipeWelding' }, s));
      expect(html.length, JSON.stringify(s)).toBeGreaterThan(1000);
    });
    ['nonsense', 'nonsense+plate4G', 42].forEach((pipe2_qtest) => {
      const t = text(render({ view: 'qualPrep', qp_view: 'matrix', pipe2_qtest, pipe2_scn: 'x', pipe2_scnidx: 'y' }));
      expect(t).toContain('A passed');
    });
  });
});

describe('facts corrected in this lane', () => {
  it('no longer teaches the five audited errors', () => {
    const r = region();
    expect(r).not.toContain('6 o\\\'clock UP through 9, 12, 3 back to 6');
    expect(r).not.toContain('Used for nuclear + critical pressure vessel work');
    expect(r).not.toContain('weld a 3G pipe joint');
    expect(r).not.toContain('Restricted 6G with backing ring');
    expect(r).not.toContain('too much amperage + too fast travel');
    expect(r).not.toContain('Qualifies for 1G, 2G, 3G as well');
    expect(r).not.toContain('Practice Quiz (30 q)');
  });

  it('teaches the corrected versions', () => {
    const r = region();
    expect(r).toContain('each from 6 o\\\'clock (bottom) up to 12 o\\\'clock (top)');
    expect(r).toContain('qualifies CJP T-, K- and Y-connections in tubular structures');
    expect(r).toContain('Fast travel LOWERS heat input');
    expect(r).toContain('6G with a restriction ring');
  });

  it('keeps every SVG text label short and inside the module region', () => {
    // SVG <text> children here are numbers, single letters or tiny codes.
    const r = region();
    const texts = [...r.matchAll(/h\('text', \{[^}]*\}, '([^']*)'\)/g)].map((m) => m[1]);
    expect(texts.length).toBeGreaterThan(5);
    texts.forEach((s) => expect(s.length, s).toBeLessThanOrEqual(4));
  });
});
