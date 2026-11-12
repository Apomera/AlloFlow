// Round 31, lane permit (pm31). The permit quiz and the drill mini-quizzes.
//  1. Answer shape. An earlier fix for "the key is the longest option" left the key SECOND longest in 84% of
//     permit items (pick the second longest = 86.5%). This gates the whole length-RANK distribution, the
//     "one option is far longer than the rest" cue, median lengths, and the absolute-word gap, for both banks.
//  2. Maine test format: 30 questions, 24 to pass, weighted to the BMV's five topic areas; car care kept out.
//  3. Category practice holds only that category. Retired duplicates stay in the bank and out of every test.
//  4. Review my misses and flashcard spacing: bank indexes and local day keys only.
//  5. Contrast inside the permit views, and STRINGS.json = the English in the tool.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import STRINGS from './roadready_pm31_strings.json';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient, RR, PM, SRC, BANK, LIVE, DRILLS;

// ── drill scenarios, read from the source the same way the measuring script does
function loadDrills(src) {
  const drills = [];
  const reQ = /q:\s*__alloT\('stem\.roadready\.([a-z]+)_q(\d+)',\s*('(?:[^'\\]|\\.)*')\)/g; let m;
  while ((m = reQ.exec(src))) {
    const seg = src.slice(m.index, m.index + 6000);
    const cm = /choices:\s*\[([\s\S]*?)\]\s*,\s*correct:\s*(\d+)/.exec(seg); if (!cm) continue;
    const next = seg.slice(1).search(/q:\s*__alloT\('stem\.roadready\.[a-z]+_q\d+'/); if (next > 0 && cm.index > next) continue;
    const a = [...cm[1].matchAll(/__alloT\('stem\.roadready\.[A-Za-z0-9_]+',\s*('(?:[^'\\]|\\.)*')\)/g)].map((x) => new Function('return ' + x[1])());
    if (a.length >= 2) drills.push({ id: m[1] + '_q' + m[2], a, correct: +cm[2] });
  }
  return drills;
}
const ABS = /\b(always|never|only|any|all|every|nothing|no one|none|regardless|exactly)\b/i;
const median = (arr) => { const s = [...arr].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
// Share of keys at each length rank (0 = longest). A tie shares its credit across the tied ranks.
function rankShares(items, n) {
  const set = items.filter((q) => q.a.length === n), h = new Array(n).fill(0);
  for (const q of set) {
    const L = q.a.map((x) => x.length), k = L[q.correct], longer = L.filter((x) => x > k).length, tied = L.filter((x) => x === k).length;
    for (let r = longer; r < longer + tied; r++) h[r] += 1 / tied;
  }
  return h.map((x) => x / set.length);
}
function shape(items) {
  const key = [], dis = []; let keyAbs = 0, disAbs = 0, app = 0, hit = 0;
  for (const q of items) {
    const L = q.a.map((x) => x.length), s = [...L].sort((a, b) => b - a);
    key.push(L[q.correct]); if (ABS.test(q.a[q.correct])) keyAbs++;
    q.a.forEach((x, i) => { if (i !== q.correct) { dis.push(x.length); if (ABS.test(x)) disAbs++; } });
    if (s[0] >= 1.3 * s[1] && s[0] - s[1] >= 8) { app++; if (L.indexOf(s[0]) === q.correct) hit++; }
  }
  return { medianKey: median(key), medianDistractor: median(dis), keyAbs: 100 * keyAbs / items.length, disAbs: 100 * disAbs / dis.length, outlierCases: app, outlierIsKey: hit };
}

beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
  SRC = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  PM = window.__RR_TEST_EXPORTS__.roadReadyPermit;
  BANK = RR.PERMIT_BANK;
  LIVE = BANK.filter((q) => !q.retired);
  DRILLS = loadDrills(SRC);
});

let mounted = [];
async function mount(roadReady) {
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  const state = { toolData: { roadReady } };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx({
      toolData,
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state };
  mounted.push(m);
  return m;
}
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  try { localStorage.clear(); } catch (e) {}
});
const d = (m) => m.state.toolData.roadReady;
const options = (m) => [...m.host.querySelectorAll('button')].filter((b) => /^[A-D]\. /.test(b.textContent));

describe('pm31 answer shape: the key cannot be found by the length of the options', () => {
  it('permit bank: every length rank holds 15% to 32% of the keys', () => {
    expect(PM, 'lane exports').toBeTruthy();
    const shares = rankShares(LIVE, 4);
    shares.forEach((s, r) => { expect(s, 'rank ' + (r + 1) + ' of 4: ' + (100 * s).toFixed(1) + '%').toBeGreaterThanOrEqual(0.15); expect(s, 'rank ' + (r + 1) + ' of 4: ' + (100 * s).toFixed(1) + '%').toBeLessThanOrEqual(0.32); });
  });
  it('drills: four-option items 15% to 32% per rank, three-option items 20% to 45%', () => {
    expect(DRILLS.length).toBeGreaterThanOrEqual(70);
    rankShares(DRILLS, 4).forEach((s, r) => { expect(s, '4-option rank ' + (r + 1) + ': ' + (100 * s).toFixed(1) + '%').toBeGreaterThanOrEqual(0.15); expect(s, '4-option rank ' + (r + 1) + ': ' + (100 * s).toFixed(1) + '%').toBeLessThanOrEqual(0.32); });
    rankShares(DRILLS, 3).forEach((s, r) => { expect(s, '3-option rank ' + (r + 1) + ': ' + (100 * s).toFixed(1) + '%').toBeGreaterThanOrEqual(0.2); expect(s, '3-option rank ' + (r + 1) + ': ' + (100 * s).toFixed(1) + '%').toBeLessThanOrEqual(0.45); });
  });
  it('key and distractor median lengths are within 25% of each other, in both banks', () => {
    for (const [name, items] of [['permit', LIVE], ['drills', DRILLS]]) {
      const s = shape(items);
      expect(s.medianKey / s.medianDistractor, name + ' ' + s.medianKey + ' vs ' + s.medianDistractor).toBeLessThanOrEqual(1.25);
      expect(s.medianKey / s.medianDistractor, name).toBeGreaterThanOrEqual(0.8);
    }
  });
  it('an option that is far longer than the rest is the key no more than half the time', () => {
    for (const [name, items] of [['permit', LIVE], ['drills', DRILLS]]) {
      const s = shape(items);
      expect(s.outlierCases, name).toBeGreaterThan(3);
      expect(s.outlierIsKey / s.outlierCases, name + ' ' + s.outlierIsKey + '/' + s.outlierCases).toBeLessThanOrEqual(0.5);
      expect(s.outlierIsKey, name + ': never the key would be a cue too').toBeGreaterThan(0);
    }
  });
  it('absolute words (always, never, only, any, all...) are about as common in keys as in distractors', () => {
    for (const [name, items] of [['permit', LIVE], ['drills', DRILLS]]) {
      const s = shape(items);
      expect(Math.abs(s.keyAbs - s.disAbs), name + ' keys ' + s.keyAbs.toFixed(1) + '% vs distractors ' + s.disAbs.toFixed(1) + '%').toBeLessThanOrEqual(8);
    }
  });
  it('throwaway distractors are gone', () => {
    for (const t of ['Whoever honks first', 'Drive only in circles', 'It only affects taller drivers', 'Open the door and jump out', 'Keep your eyes closed', 'Pass only if you have a truck with a horn', 'A door alarm']) expect(SRC).not.toContain(t);
  });
});

describe('pm31 item fixes', () => {
  it('positions are untouched: 193 original items in place, new ones appended, duplicates retired not deleted', () => {
    expect(BANK.length).toBeGreaterThanOrEqual(261);
    expect(BANK[0].q).toBe('At a 4-way stop intersection, who has the right-of-way when two vehicles arrive at the same time?');
    expect(BANK[192].q).toContain('deep pothole');
    expect(BANK[193].q).toBe('What does a steady yellow traffic light mean?');
    for (const i of [67, 73, 93, 173]) expect(BANK[i].retired, 'q' + i).toBe(true);
    expect(BANK[67].q).toContain('merging onto a highway');
    expect(BANK.filter((q) => q.retired).length).toBe(4);
    expect(PM.PERMIT_ACTIVE_COUNT).toBe(BANK.length - 4);
  });
  it('q46 is a four-way choice, not true/false, and its numbers come from the arithmetic', () => {
    const q = BANK[46];
    expect(q.q).not.toMatch(/true or false/i);
    const saved = (a, b) => 10000 / a - 10000 / b;
    const pairs = q.a.map((o) => o.match(/(\d+) MPG to (\d+) MPG/).slice(1).map(Number));
    const best = pairs.map(([a, b]) => saved(a, b));
    expect(best.indexOf(Math.max(...best))).toBe(q.correct);
    for (const [a, b] of pairs) expect(q.exp).toContain(String(Math.round(saved(a, b))));
  });
  it('q33 asks what does NOT save fuel; q7 has one complete answer and no "Only ..." trio', () => {
    expect(BANK[33].q).toBe('Which of these does NOT save fuel?');
    expect(BANK[7].a[BANK[7].correct]).toMatch(/sunset to sunrise/);
    expect(BANK[7].a[BANK[7].correct]).toMatch(/wipers/);
    expect(BANK[7].a.filter((o) => /^Only/.test(o)).length).toBe(0);
  });
  it('fewer stems are sentence fragments ending in a colon', () => {
    expect(LIVE.filter((q) => /:\s*$/.test(q.q)).length).toBeLessThanOrEqual(115);
    expect(BANK.slice(193).filter((q) => /:\s*$/.test(q.q))).toEqual([]);
  });
  it('the bank is no longer thin where the BMV test is heavy', () => {
    const n = (c) => LIVE.filter((q) => q.category === c).length;
    expect(n('signs')).toBeGreaterThanOrEqual(30);
    expect(n('distracted')).toBeGreaterThanOrEqual(12);
    expect(n('pedestrian')).toBeGreaterThanOrEqual(20);
    expect(RR.PERMIT_CATEGORIES.map((c) => c.id)).toContain('distracted');
    const all = LIVE.map((q) => q.q + ' ' + q.a[q.correct] + ' ' + q.exp).join('\n');
    for (const fact of ['250 feet', 'provisional for two years', '30-day suspension', '180 days', 'warning is sent at 6 points', '12 or more', 'name and address', 'liability insurance', 'inside lights', '500 feet of an oncoming', '$2,000 or more']) expect(all, fact).toContain(fact);
  });
});

describe('pm31 test formats', () => {
  it('Maine test format: 30 questions, pass 24, split across the five BMV topic areas, no car care', () => {
    expect(PM.PERMIT_MAINE_FORMAT.total).toBe(30);
    expect(PM.PERMIT_MAINE_FORMAT.pass).toBe(24);
    expect(PM.PERMIT_MAINE_FORMAT.areas.map((a) => a.id)).toEqual(['rules', 'signs', 'pedbike', 'oui', 'distracted']);
    expect(PM.PERMIT_MAINE_FORMAT.areas.reduce((s, a) => s + a.n, 0)).toBe(30);
    for (let run = 0; run < 25; run++) {
      const t = PM.buildMaineTest();
      expect(t.length).toBe(30);
      expect(new Set(t.map((q) => q.bi)).size).toBe(30);
      const count = (cats) => t.filter((q) => cats.includes(q.category)).length;
      for (const area of PM.PERMIT_MAINE_FORMAT.areas) expect(count(area.cats), area.id).toBe(area.n);
      for (const q of t) { expect(q.category).not.toBe('maintenance'); expect(q.extra).not.toBe(true); expect(q.retired).not.toBe(true); expect(BANK[q.bi].a[BANK[q.bi].correct]).toBe(q.a[q.correct]); }
    }
  });
  it('fuel and car-care trivia sits in its own category, outside the Maine format', () => {
    for (const i of [29, 30, 31, 32, 33, 46, 47, 97]) expect(BANK[i].category, 'q' + i).toBe('maintenance');
    expect(RR.PERMIT_CATEGORIES.find((c) => c.id === 'maintenance').label).toBe('Car Care & Fuel');
    expect(LIVE.filter((q) => q.category === 'maintenance').length).toBeGreaterThanOrEqual(20);
  });
  it('a category test holds only that category: min(20, items)', () => {
    for (const c of RR.PERMIT_CATEGORIES) {
      const have = LIVE.filter((q) => q.category === c.id).length;
      for (let run = 0; run < 5; run++) {
        const t = RR.buildCategoryTest(c.id);
        expect(t.length, c.id).toBe(Math.min(20, have));
        expect(t.every((q) => q.category === c.id), c.id).toBe(true);
      }
    }
  });
  it('no builder serves a retired question', () => {
    const retired = new Set(BANK.map((q, i) => (q.retired ? i : -1)).filter((i) => i >= 0));
    for (let run = 0; run < 60; run++) for (const q of RR.buildRandomTest()) expect(retired.has(q.bi)).toBe(false);
    expect(RR.buildRandomTest().length).toBe(20);
    expect(PM.rrPermitPool().length).toBe(PM.PERMIT_ACTIVE_COUNT);
  });
});

describe('pm31 study record: indexes and day keys only', () => {
  it('a miss is saved, a later right answer removes it, junk is dropped', () => {
    let s = PM.rrStudyAfterAnswer(null, 5, false, '2026-11-10');
    s = PM.rrStudyAfterAnswer(s, 5, false, '2026-11-11');
    s = PM.rrStudyAfterAnswer(s, 9, false, '2026-11-11');
    expect(s.misses).toEqual({ 5: { n: 2, d: '2026-11-11' }, 9: { n: 1, d: '2026-11-11' } });
    expect(PM.rrStudyAfterAnswer(s, 5, true, '2026-11-12').misses).toEqual({ 9: { n: 1, d: '2026-11-11' } });
    const clean = PM.rrCleanPermitStudy({ misses: { 3: { n: 1, d: '2026-11-10', name: 'Sam' }, 9999: { n: 1, d: '2026-11-10' }, 67: { n: 1, d: '2026-11-10' }, x: 1, 4: { n: 1, d: 'yesterday' } }, cards: [1, 2], extra: 'x' });
    expect(clean).toEqual({ misses: { 3: { n: 1, d: '2026-11-10' } }, cards: {} });
    expect(PM.buildMissedTest(s.misses).map((q) => q.bi).sort((a, b) => a - b)).toEqual([5, 9]);
  });
  it('flashcards space over days: missed = 1 day, then 3, then 7', () => {
    expect(PM.RR_CARD_INTERVALS).toEqual([1, 3, 7]);
    expect(PM.rrAddDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(PM.rrAddDays('2026-12-29', 7)).toBe('2027-01-05');
    let s = PM.rrCardAfterRating(null, 12, false, '2026-11-10');
    expect(s.cards[12]).toEqual({ s: 1, due: '2026-11-11' });
    s = PM.rrCardAfterRating(s, 12, true, '2026-11-11'); expect(s.cards[12]).toEqual({ s: 2, due: '2026-11-14' });
    s = PM.rrCardAfterRating(s, 12, true, '2026-11-14'); expect(s.cards[12]).toEqual({ s: 3, due: '2026-11-21' });
    s = PM.rrCardAfterRating(s, 12, true, '2026-11-21'); expect(s.cards[12]).toEqual({ s: 3, due: '2026-11-28' });
    s = PM.rrCardAfterRating(s, 12, false, '2026-11-28'); expect(s.cards[12]).toEqual({ s: 1, due: '2026-11-29' });
    expect(PM.rrCardAfterRating(null, 40, true, '2026-11-10').cards[40]).toEqual({ s: 2, due: '2026-11-13' });
    const plan = PM.rrCardQueue({ cards: { 12: { s: 1, due: '2026-11-11' }, 3: { s: 2, due: '2026-11-09' }, 8: { s: 3, due: '2026-11-20' } } }, '2026-11-11');
    expect(plan.due).toEqual([3, 12]);
    expect(plan.later).toEqual([8]);
    expect(plan.nextDue).toBe('2026-11-20');
    expect(plan.fresh.length).toBe(PM.PERMIT_ACTIVE_COUNT - 3);
    expect(plan.fresh).not.toContain(67);
  });
});

describe('pm31 views', () => {
  it('start page: Maine test format starts a 30-question test; quick practice is named and still 20', async () => {
    const m = await mount({ view: 'permitStart' });
    const maine = m.host.querySelector('button[data-rr-permit-maine]');
    expect(maine.textContent).toContain('Maine test format');
    expect(maine.textContent).toContain('30 questions');
    expect(m.host.querySelector('button[data-rr-permit-quick]').textContent).toContain('Quick Practice');
    expect(m.host.textContent).toContain('the real Maine knowledge test has 30 questions and you need 24 right to pass');
    expect(m.host.textContent).not.toContain('Pass at 80% (16 of 20)');
    await React.act(async () => { maine.click(); });
    expect(d(m).view).toBe('permit');
    expect(d(m).permit.mode).toBe('maine');
    expect(d(m).permit.questions.length).toBe(30);
    const m2 = await mount({ view: 'permitStart' });
    await React.act(async () => { m2.host.querySelector('button[data-rr-permit-quick]').click(); });
    expect(d(m2).permit.questions.length).toBe(20);
    expect(d(m2).permit.mode).toBe('quick');
  });
  it('a wrong answer is saved for "Review my misses" as an index and a day, and the review test serves it', async () => {
    const qs = RR.buildCategoryTest('signs').slice(0, 2);
    const m = await mount({ view: 'permit', permit: { questions: qs, index: 0, answers: [], score: 0, done: false, mode: 'category' } });
    const wrong = (qs[0].correct + 1) % 4;
    await React.act(async () => { options(m)[wrong].click(); });
    const saved = JSON.parse(localStorage.getItem('roadReady.permitStudy.v1'));
    expect(Object.keys(saved.misses)).toEqual([String(qs[0].bi)]);
    expect(saved.misses[qs[0].bi]).toEqual({ n: 1, d: RR.localDayKey() });
    expect(JSON.stringify(saved)).not.toContain(qs[0].q.slice(0, 12));
    const start = await mount({ view: 'permitStart' });
    const btn = start.host.querySelector('button[data-rr-permit-misses]');
    expect(btn.textContent).toContain('Review my misses');
    expect(btn.textContent).toContain('1 to review');
    await React.act(async () => { btn.click(); });
    expect(d(start).permit.mode).toBe('misses');
    expect(d(start).permit.questions.map((q) => q.bi)).toEqual([qs[0].bi]);
    // answer it right: it leaves the list
    await React.act(async () => { options(start)[d(start).permit.questions[0].correct].click(); });
    expect(JSON.parse(localStorage.getItem('roadReady.permitStudy.v1')).misses).toEqual({});
  });
  it('with no misses saved the review button does nothing', async () => {
    const m = await mount({ view: 'permitStart' });
    const btn = m.host.querySelector('button[data-rr-permit-misses]');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    await React.act(async () => { btn.click(); });
    expect(d(m).view).toBe('permitStart');
  });
  it('category page says how many questions each test has', async () => {
    const m = await mount({ view: 'permitCategory' });
    const n = LIVE.filter((q) => q.category === 'gdl').length;
    expect(m.host.textContent).toContain('Test: ' + Math.min(20, n) + ' questions · ' + n + ' in this category');
    expect(m.host.textContent).not.toContain('padded');
  });
  it('permit view inks do not depend on the theme where the background is fixed', async () => {
    const Q = () => ({ q: 'First question?', a: ['Alpha', 'Bravo', 'Charlie', 'Delta'], correct: 1, exp: 'Because bravo.', category: 'general' });
    const m = await mount({ view: 'permit', permit: { questions: [Q(), Q()], index: 0, answers: [], score: 0, done: false } });
    await React.act(async () => { options(m)[2].click(); });
    const line = m.host.querySelector('[data-rr-permit-result-line]');
    expect(line.style.color).toBe('var(--allo-stem-text, #e2e8f0)');
    const next = m.host.querySelector('button[data-rr-permit-next]');
    expect(next.style.background).toBe('rgb(71, 85, 105)');
    expect(next.style.color).toBe('rgb(248, 250, 252)');
    expect(next.style.opacity).toBe('');
    const done = await mount({ view: 'permit', permit: { questions: [Q(), Q()], index: 1, answers: [{ chosen: 0, correct: false }, { chosen: 0, correct: false }], score: 0, done: true } });
    const h2 = done.host.querySelector('h2[data-rr-permit-result]');
    expect(h2.textContent).toBe('Keep Studying');
    expect(h2.style.color).toBe('rgb(248, 250, 252)');
    expect(SRC).not.toContain("color: '#a5f3fc', lineHeight: '1.5'");
    expect(SRC).not.toContain('You would pass the real test.');
  });
  it('a Maine-format pass says so; a practice pass points to the Maine format', async () => {
    const Q = () => ({ q: 'First question?', a: ['Alpha', 'Bravo', 'Charlie', 'Delta'], correct: 1, exp: 'Because bravo.', category: 'general' });
    const state = (mode) => ({ view: 'permit', permit: { questions: [Q(), Q()], index: 1, answers: [{ chosen: 1, correct: true }, { chosen: 1, correct: true }], score: 2, done: true, mode } });
    expect((await mount(state('maine'))).host.textContent).toContain('You reached the real pass mark: 24 or more out of 30.');
    expect((await mount(state('quick'))).host.textContent).toContain('Next, try the Maine test format: 30 questions, 24 to pass.');
  });
  it('flashcards: rating a card schedules it on a later day and saves indexes only', async () => {
    const m = await mount({ view: 'permitFlashcards' });
    expect(m.host.textContent).toContain('A card you miss comes back tomorrow. Then after 3 days, then after 7 days.');
    expect(m.host.querySelector('[data-rr-flash-plan]').textContent).toBe('Due today: 0 · New: ' + PM.PERMIT_ACTIVE_COUNT + ' · Coming back later: 0');
    await React.act(async () => { [...m.host.querySelectorAll('button')].find((b) => b.textContent === 'Reveal Answer').click(); });
    await React.act(async () => { m.host.querySelector('button[data-rr-flash-again]').click(); });
    const saved = JSON.parse(localStorage.getItem('roadReady.permitStudy.v1'));
    expect(saved.cards).toEqual({ 0: { s: 1, due: PM.rrAddDays(RR.localDayKey(), 1) } });
    expect(m.host.querySelector('[data-rr-flash-plan]').textContent).toBe('Due today: 0 · New: ' + (PM.PERMIT_ACTIVE_COUNT - 1) + ' · Coming back later: 1');
    expect(SRC).not.toContain('Harder questions cycle back faster');
  });
  it('flashcards: a card that is due comes first; nothing due and nothing new shows the next date', async () => {
    const today = RR.localDayKey();
    const cards = {}; BANK.forEach((q, i) => { if (!q.retired) cards[i] = { s: 3, due: PM.rrAddDays(today, 5) }; });
    localStorage.setItem('roadReady.permitStudy.v1', JSON.stringify({ misses: {}, cards }));
    const m = await mount({ view: 'permitFlashcards' });
    expect(m.host.querySelector('[data-rr-flash-done]').textContent).toContain('Your next cards come back on ' + PM.rrAddDays(today, 5) + '.');
    cards[41] = { s: 1, due: PM.rrAddDays(today, -1) };
    localStorage.setItem('roadReady.permitStudy.v1', JSON.stringify({ misses: {}, cards }));
    const m2 = await mount({ view: 'permitFlashcards' });
    expect(m2.host.textContent).toContain(BANK[41].q);
    expect(m2.host.querySelector('[data-rr-flash-plan]').textContent).toContain('Due today: 1');
  });
});

describe('pm31 STRINGS.json matches the tool', () => {
  it('every new and changed key has exactly the English recorded for ui_strings', () => {
    const map = new Map();
    const re = /__allo(?:RR)?T\((['"])stem\.roadready\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g; let x;
    while ((x = re.exec(SRC))) { if (!map.has(x[2])) map.set(x[2], new Function('return ' + x[3])()); }
    BANK.forEach((q, i) => { map.set('permit_q' + i + '_q', q.q); q.a.forEach((a, j) => map.set('permit_q' + i + '_a' + j, a)); map.set('permit_q' + i + '_exp', q.exp); });
    const wrong = [];
    for (const [k, v] of Object.entries(STRINGS.new)) if (map.get(k) !== v) wrong.push(k);
    for (const [k, v] of Object.entries(STRINGS.changed)) if (map.get(k) !== v.new) wrong.push(k);
    expect(wrong).toEqual([]);
    expect(Object.keys(STRINGS.new).length).toBeGreaterThan(400);
    for (let i = 193; i < BANK.length; i++) expect(STRINGS.new['permit_q' + i + '_q'], 'q' + i).toBe(BANK[i].q);
    for (const v of Object.values(STRINGS.new)) expect(v).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
