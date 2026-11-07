// Ratios Lab engagement build (2026-11-04): explore defaults that never show
// the open problem's answer, a model the student builds, a calmer first
// screen (folded path, Start lands on the task, Missions behind a tab, one
// detective case at a time), grades 4-5 opening on "times as many", and the
// Mixtures pour. RATIOS_DEEP_FILE points the suite at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let tool;
let root = null;
beforeEach(() => { resetStemLab(); tool = loadTool(FILE, 'ratioLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; vi.restoreAllMocks(); });

async function mount(initial, overrides) {
  const out = { latest: null, xp: [], announced: [], errors: [] };
  vi.spyOn(console, 'error').mockImplementation((...a) => out.errors.push(a.map(String).join(' ').slice(0, 300)));
  function App() {
    const [state, setState] = React.useState(initial);
    out.latest = state;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, awardXP: (...a) => out.xp.push(a), addToast: () => {},
      announceToSR: (m) => out.announced.push(m),
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  out.state = () => out.latest._ratioLab || {};
  return out;
}
async function unmount() { if (root) await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>'; }
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const byText = (text, scope) => [...(scope || document).querySelectorAll('button')].find((b) => b.textContent === text);
async function click(el) { await React.act(async () => { el.click(); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const P = () => window.RatioLabPure;
const GRADE = { g45: '5th Grade', g6: '6th Grade', g7: '7th Grade', g8: '8th Grade' };
const MODES = ['ratioTable', 'numberLine', 'unitRates', 'percent', 'proportional'];
function answerFor(problem) { return problem.answer != null ? String(problem.answer) : String(problem.answers[0]); }

// Tab stops as a keyboard user meets them: radio groups count once and
// nothing inside a closed <details> counts.
function tabStops(scope) {
  const seen = new Set();
  return [...(scope || document).querySelectorAll('button,select,input,textarea,a[href],[tabindex],summary')].filter((n) => {
    if (n.disabled || n.tabIndex < 0) return false;
    const closed = n.closest('details:not([open])');
    if (closed && !(n.tagName === 'SUMMARY' && n.parentElement === closed)) return false;
    if (n.type === 'radio') { if (seen.has(n.name)) return false; seen.add(n.name); }
    return true;
  });
}

// ---- (1) Free-exploration defaults --------------------------------------
// Every number the default workspace shows, read from the rendered markup:
// input values, table cells, drawings and results. Row-operation labels
// (<th>), range notes and the fixed 10% ... 100% tape marks are structure.
function exploreNumbers(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  const box = host.querySelector('[data-ratio-exploration]');
  const inputs = [...box.querySelectorAll('input')].filter((i) => i.type !== 'checkbox' && i.type !== 'radio').map((i) => i.getAttribute('value') || '');
  box.querySelectorAll('th, [role="note"], [data-percent-segment] text, [data-percent-tape] strong, label > span, legend, select, code').forEach((n) => n.remove());
  [...box.querySelectorAll('p')].filter((p) => /text-xs/.test(p.className || '')).forEach((p) => p.remove());
  // The percent tape's fixed scale ("each represent 10% of one whole") is structure.
  // So is the count of plotted rows in the graph's description.
  const text = inputs.join(' ') + ' ' + box.textContent.replace(/each represent 10% of one whole/g, '').replace(/Whole \d+ percent tape/g, '').replace(/Graph of \d+ plotted table points/g, '');
  return { inputs, numbers: (text.replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).map(Number) };
}
const close = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)) || Math.abs(Math.round(a * 100) / 100 - b) < 1e-9;
function problemRates(problem) {
  const rates = [];
  const rows = (problem.model && problem.model.rows) || [];
  for (const row of rows) {
    const nums = row.map((c) => (typeof c === 'number' ? c : Number(String(c).replace(/[$%]/g, '')))).filter((v) => Number.isFinite(v));
    if (nums.length >= 2 && nums[0] !== 0) rates.push(nums[1] / nums[0]);
  }
  const p = problem.params || {};
  if (Number.isFinite(p.a) && Number.isFinite(p.b) && p.a) rates.push(p.b / p.a);
  if (Number.isFinite(p.c) && Number.isFinite(p.e) && p.c) rates.push(p.e / p.c);
  if (problem.graph) for (const [x, y] of problem.graph.points) if (x) rates.push(y / x);
  return rates;
}
function inputRates(mode, inputs) {
  const n = inputs.map(Number);
  if (mode === 'ratioTable' || mode === 'numberLine') return [n[1] / n[0]];
  if (mode === 'unitRates') return [n[1] / n[0], n[3] / n[2]];
  if (mode === 'proportional') {
    const xs = inputs[0].split(',').map(Number), ys = inputs[1].split(',').map(Number);
    return xs.map((x, i) => (x ? ys[i] / x : null)).filter((v) => v != null);
  }
  return [];
}
function problemsToCheck() {
  const out = [];
  for (const mode of MODES) {
    for (const pr of P().challenges[mode]) out.push({ mode, band: 'g6', state: { mode, sourceByMode: { [mode]: 'fixed' }, challengeCursorByMode: { [mode]: pr.id } }, problem: pr });
    for (const band of P().bands) {
      for (const kind of P().practiceKinds[mode][band]) {
        let seed = 1;
        for (let n = 0; n < 2; n++) {
          seed = P().seedForKind(mode, band, kind, seed * 7 + 13 + n, {});
          const pr = P().generateProblem(mode, band, seed);
          out.push({ mode, band, state: { mode, sourceByMode: { [mode]: 'practice' }, practiceSeedByMode: { [mode + ':' + band]: seed } }, problem: pr });
        }
      }
    }
  }
  return out;
}

describe('(1) free exploration never shows the open problem\'s answer', () => {
  it('rendered defaults avoid the answer and the problem\'s own ratios, for every lesson and every practice kind in every band', () => {
    const leaks = [];
    const cases = problemsToCheck();
    expect(cases.length).toBeGreaterThan(100);
    for (const c of cases) {
      const html = renderTool('ratioLab', { _ratioLab: c.state }, { gradeLevel: GRADE[c.band] });
      expect(html).toContain('data-ratio-exploration');
      const { inputs, numbers } = exploreNumbers(html);
      const key = typeof c.problem.answer === 'number' ? c.problem.answer : null;
      if (key != null && numbers.some((v) => close(v, key))) leaks.push(c.problem.id + ' shows its answer ' + key);
      const mine = inputRates(c.mode, inputs), theirs = problemRates(c.problem);
      if (mine.some((r) => theirs.some((s) => close(r, s)))) leaks.push(c.problem.id + ' explores its own ratio');
    }
    expect(leaks).toEqual([]);
  }, 120000);

  it('across 400 seeds per mode and band, the default never shares the answer or a ratio with the problem', () => {
    const bad = [];
    for (const mode of MODES) for (const band of P().bands) for (let seed = 1; seed <= 400; seed++) {
      const pr = P().generateProblem(mode, band, seed);
      const def = P().exploreDefaultsFor(mode, pr);
      if (P().exploreLeaks(mode, def, pr)) bad.push(mode + ':' + band + ':' + seed);
    }
    for (const mode of MODES) for (const pr of P().challenges[mode]) if (P().exploreLeaks(mode, P().exploreDefaultsFor(mode, pr), pr)) bad.push(pr.id);
    expect(bad).toEqual([]);
  }, 60000);

  it('the explore example buttons never load the open problem either', () => {
    const bad = [];
    const unit = [...P().challenges.unitRates];
    for (const band of P().bands) for (let seed = 1; seed <= 200; seed++) unit.push(P().generateProblem('unitRates', band, seed));
    for (const pr of unit) for (const id of ['package', 'sameUnit', 'zeroCost']) {
      const ex = P().exploreExampleFor(id, 'unitRates', pr);
      if (ex && problemRates(pr).some((s) => close(ex[1] / ex[0], s) || close(ex[3] / ex[2], s))) bad.push(pr.id + ' ' + id);
    }
    const prop = [...P().challenges.proportional];
    for (const band of P().bands) for (let seed = 1; seed <= 200; seed++) prop.push(P().generateProblem('proportional', band, seed));
    for (const pr of prop) for (const id of ['proportional', 'nonProportional']) {
      const ex = P().exploreExampleFor(id, 'proportional', pr);
      expect(ex, pr.id + ' ' + id).toBeTruthy();
      if (problemRates(pr).some((s) => inputRates('proportional', ex).some((r) => close(r, s)))) bad.push(pr.id + ' ' + id);
    }
    expect(bad).toEqual([]);
  }, 60000);

  it('the paint lesson no longer shows 12 : 20 in free exploration, and still credits 15 XP once', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable' } }, { gradeLevel: '6th Grade' });
    expect($('#ratio-challenge-prompt').textContent).toContain('3 cups blue for every 5 cups white');
    const box = $('[data-ratio-exploration]');
    expect([...box.querySelectorAll('[data-ratio-table] td')].map((td) => td.textContent)).not.toContain('12');
    expect(box.textContent).not.toMatch(/\b12:20\b/);
    await type(document.getElementById('ratio-challenge-answer'), '12');
    await click(byText('Check answer'));
    expect(app.xp).toEqual([['ratioLab', 15, 'Ratio Lab challenge']]);
  });
});

// ---- (2) The student builds the model ------------------------------------
describe('(2) Model this problem: built by the student', () => {
  it('opens by default with labelled cells; the unknown stays "?" until a check; Check reads the table', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable' } }, { gradeLevel: '6th Grade' });
    const model = $('[data-ratio-problem-model="ratio-paint"]');
    expect(model.open).toBe(true);
    expect(model.getAttribute('data-model-build')).toBe('table');
    // The model does not fill itself in: no givens, no factor, no answer.
    expect(model.textContent).not.toContain('× 4');
    expect($$('[data-model-cell]').map((i) => i.value)).toEqual(['', '']);
    expect($('[data-model-unknown]').textContent).toContain('?');
    const cell = (r, c) => document.getElementById('ratio-model-cell-ratio-paint-' + r + '-' + c);
    expect(cell(0, 0).getAttribute('aria-label')).toBe('Row 1, Blue paint (cups)');
    expect(cell(0, 1).getAttribute('aria-label')).toBe('Row 1, White paint (cups)');
    expect($('[data-model-find]').getAttribute('aria-label')).toBe('Find row, White paint (cups)');
    await type(cell(0, 0), '3'); await type(cell(0, 1), '5');
    await click($('[data-model-add-row]'));
    await tick();
    expect(app.announced).toContain('Row 2 added.');
    expect(document.activeElement).toBe(cell(1, 0));
    await type(cell(1, 0), '5'); await type(cell(1, 1), '7');
    await type($('[data-model-find]'), '20');
    // Typing never judges the table: no verdict before a check.
    expect(model.textContent).not.toMatch(/adds|keeps the same ratio/);
    await type(document.getElementById('ratio-challenge-answer'), '17');
    await click(byText('Check answer'));
    const fb = () => document.getElementById('ratio-challenge-feedback').textContent;
    expect(fb()).toContain('Your table: Row 2 adds 2 to both amounts.');
    expect($('[data-model-unknown]').getAttribute('data-model-unknown')).toBe('open');
    expect($('[data-model-unknown]').textContent).toContain('?');
    await type(cell(1, 0), '12'); await type(cell(1, 1), '20');
    await type(document.getElementById('ratio-challenge-answer'), '12');
    await click(byText('Check answer'));
    expect(fb()).toContain('Correct!');
    expect(fb()).toContain('Every row keeps the same ratio as the problem.');
    expect($('[data-model-unknown]').getAttribute('data-model-unknown')).toBe('solved');
    expect($('[data-model-unknown]').textContent).toContain('12');
    expect($('[data-model-row="1"] th').textContent).toBe('Row 2 (× 4)');
    expect(app.xp).toEqual([['ratioLab', 15, 'Ratio Lab challenge']]);
    expect(app.errors).toEqual([]);
  });

  it('removing a row keeps focus, and a table left empty adds nothing to the feedback', async () => {
    await mount({ _ratioLab: { mode: 'unitRates', challengeCursorByMode: { unitRates: 'unit-speed' } } }, { gradeLevel: '6th Grade' });
    expect($('[data-ratio-problem-model="unit-speed"]').getAttribute('data-model-build')).toBe('table');
    await click($('[data-model-add-row]'));
    await click($('[data-model-remove-row]'));
    await tick();
    expect(document.activeElement.hasAttribute('data-model-add-row')).toBe(true);
    await type(document.getElementById('ratio-challenge-answer'), '50');
    await click(byText('Check answer'));
    expect(document.getElementById('ratio-challenge-feedback').textContent).not.toContain('Your table');
  });

  it('a double-number-line problem draws the student\'s rows, and its unit-rate scaffold waits for a check', async () => {
    await mount({ _ratioLab: { mode: 'numberLine' } }, { gradeLevel: '6th Grade' });
    const line = () => $('[data-linked-ratio-line="line-tickets"]');
    expect(line()).toBeTruthy();
    expect(line().querySelector('[data-line-scaffold]')).toBeNull();
    expect(line().textContent).not.toContain('15');
    await type(document.getElementById('ratio-model-cell-line-tickets-0-0'), '5');
    await type(document.getElementById('ratio-model-cell-line-tickets-0-1'), '15');
    await type($('[data-model-find]'), '8');
    const texts = [...line().querySelectorAll('text')];
    const x = (s) => Number(texts.find((n) => n.textContent === s).getAttribute('x'));
    expect(x('5')).toBe(x('15'));
    expect(x('8')).toBe(x('?'));
    expect(line().textContent).not.toContain('24');
    await type(document.getElementById('ratio-challenge-answer'), '18');
    await click(byText('Check answer'));
    expect(line().querySelector('[data-line-scaffold]').textContent).toBe('For 1 ticket, the cost is $3.');
  });

  it('times-as-many is a tape the student sizes; Check reads the bars; the reveal still earns nothing', async () => {
    const seed = P().defaultPracticeSeed('ratioTable', 'g45');
    const problem = P().generateProblem('ratioTable', 'g45', seed);
    expect(problem.kind).toBe('multCompare');
    const app = await mount({ _ratioLab: {} }, { gradeLevel: '5th Grade' });
    const model = $('[data-ratio-problem-model]');
    expect(model.open).toBe(true);
    expect(model.getAttribute('data-model-build')).toBe('tape');
    // Both bars start at 1 unit: the student builds the comparison.
    expect($$('[data-tape-units]').map((n) => n.textContent)).toEqual(['1 unit', '1 unit']);
    const bigLabel = problem.tape.rows[1].label;
    const more = $('[data-tape-more="1"]');
    expect(more.getAttribute('aria-label')).toBe('More units in ' + bigLabel);
    for (let i = 1; i < problem.params.m; i++) await click(more);
    expect(app.announced).toContain(bigLabel + ': ' + problem.params.m + ' units.');
    expect($$('[data-ratio-problem-model] [data-ratio-tape] rect').length).toBe(1 + problem.params.m);
    expect($('[data-ratio-problem-model] [data-ratio-tape] desc').textContent).toContain(problem.params.m + ' equal units');
    expect(model.textContent).not.toContain(String(problem.answer));
    await click($('input[name="ratio-problem-predict"][value="predict-multiply"]'));
    await type(document.getElementById('ratio-challenge-answer'), answerFor(problem));
    await click(byText('Check answer'));
    const fb = document.getElementById('ratio-challenge-feedback').textContent;
    expect(fb).toContain('Correct!');
    expect(fb).toContain('matches the problem');
    expect(model.textContent).toContain(String(problem.answer));
    await unmount();
    // The same tape after a reveal: no credit, and the "?" stays.
    const app2 = await mount({ _ratioLab: {} }, { gradeLevel: '5th Grade' });
    await click($('input[name="ratio-problem-predict"][value="predict-multiply"]'));
    const ans = document.getElementById('ratio-challenge-answer');
    await type(ans, '9999'); await click(byText('Check answer'));
    await type(ans, '9998'); await click(byText('Check answer'));
    await click($('[data-ratio-reveal]'));
    await type(ans, answerFor(problem)); await click(byText('Check answer'));
    expect(document.getElementById('ratio-challenge-feedback').textContent).toContain('does not count');
    expect($('[data-ratio-problem-model] [data-ratio-tape] desc').textContent).not.toContain(String(problem.answer));
    expect(app2.state().kindStats).toBeUndefined();
    expect(app2.xp).toEqual([]);
  });

  it('pure: the table check names additive, swapped and non-equivalent rows, and the tape check accepts scaled bars', () => {
    const spec = P().buildableTableSpec([['A', 'B'], [[3, 5], ['?', 20]]], {});
    expect(spec).toMatchObject({ givens: [[3, 5]], find: { col: 0, known: 20 } });
    const r = P().checkModelTable(spec, { rows: [['3', '5'], ['5', '7'], ['5', '3'], ['6', '11'], ['6', '10']], find: '20' });
    expect(r.rows.map((x) => x.status)).toEqual(['given', 'additive', 'swapped', 'notEquivalent', 'equivalent']);
    expect(r.ok).toBe(false);
    expect(P().checkModelTable(spec, { rows: [['3', '5'], ['12', '20']], find: '20' }).ok).toBe(true);
    expect(P().buildableTableSpec([['A', 'B'], [[18, 24], ['?', '?']]], {})).toBeNull();
    const tape = { rows: [{ units: 1 }, { units: 4 }] };
    expect(P().checkModelTape(tape, [2, 8]).ok).toBe(true);
    expect(P().checkModelTape(tape, [1, 3]).ok).toBe(false);
  });
});

// ---- (3) A calmer first screen ------------------------------------------
describe('(3) calmer first screen, Start lands on the task, Missions behind a tab', () => {
  it('the path is folded to its next step; Start scrolls to the problem and focuses the required prediction', async () => {
    const scrolled = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function() { scrolled.push(this.id || this.tagName); };
    try {
      const app = await mount({ _ratioLab: {} }, { gradeLevel: '5th Grade' });
      expect($('#ratio-path-steps')).toBeNull();
      expect($('[data-ratio-path-next]').textContent).toContain('Next: Times as many: multiply');
      const toggle = $('[data-ratio-path-toggle]');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.textContent).toBe('Show all 4 steps');
      await click($('[data-ratio-path-go]'));
      await tick();
      expect(scrolled).toContain('ratio-challenge-section');
      expect(document.activeElement.name).toBe('ratio-problem-predict');
      await click($('input[name="ratio-problem-predict"][value="predict-multiply"]'));
      await click($('[data-ratio-path-go]'));
      await tick();
      expect(document.activeElement.id).toBe('ratio-challenge-answer');
      await click(toggle);
      expect($$('[data-path-step]').length).toBe(4);
      expect(app.errors).toEqual([]);
    } finally { Element.prototype.scrollIntoView = original; }
  });

  it('grade 7 opens with about 25 tab stops; missions wait behind their tab, one detective case at a time', async () => {
    const app = await mount({ _ratioLab: {} }, { gradeLevel: '7th Grade' });
    expect($('[data-ratio-missions]')).toBeNull();
    const stops = tabStops().length;
    expect(stops).toBeLessThanOrEqual(30);
    const missionsTab = document.getElementById('ratio-view-tab-missions');
    expect(missionsTab.getAttribute('role')).toBe('tab');
    expect(missionsTab.tabIndex).toBe(-1);
    // Arrow keys move between the two sections.
    await key(document.getElementById('ratio-view-tab-practice'), 'ArrowRight');
    expect(app.state().labView).toBe('missions');
    expect(document.activeElement.id).toBe('ratio-view-tab-missions');
    expect($('[data-ratio-mission="detective"]')).toBeTruthy();
    const seed = Number($('[data-ratio-mission="detective"]').getAttribute('data-mission-seed'));
    const ms = P().buildMission('detective', seed);
    expect($$('[data-ratio-mission-step]').length).toBe(1);
    expect($$('[data-ratio-case-dot]').length).toBe(7);
    expect($$('[data-ratio-case-dot]').filter((dot) => dot.tabIndex === 0).length).toBe(1);
    expect(tabStops($('[data-ratio-missions]')).length).toBeLessThanOrEqual(12);
    const c = ms.cases[0];
    await click($('input[name="ratio-ms-detective-' + c.id + '-v"][value="' + (c.proportional ? 'yes' : 'no') + '"]'));
    await click($('input[name="ratio-ms-detective-' + c.id + '-e"][value="' + c.evidence + '"]'));
    await click($('[data-ratio-mission-check="' + c.id + '"]'));
    await tick();
    expect($('[data-ratio-case-dot="' + c.id + '"]').getAttribute('data-solved')).toBe('true');
    expect(document.activeElement.getAttribute('data-ratio-next-case')).toBe(ms.cases[1].id);
    await click(document.activeElement);
    await tick();
    expect($('[data-ratio-mission-step]').getAttribute('data-ratio-mission-step')).toBe(ms.cases[1].id);
    expect(document.activeElement.name).toBe('ratio-ms-detective-' + ms.cases[1].id + '-v');
    // The dots take arrow keys and keep focus.
    await key($('[data-ratio-case-dot="' + ms.cases[1].id + '"]'), 'End');
    await tick();
    expect(document.activeElement.id).toBe('ratio-case-dot-' + ms.cases[6].id);
    expect(app.errors).toEqual([]);
  });

  it('a mission step on the path opens the Missions tab and focuses its first control', async () => {
    const app = await mount({ _ratioLab: {} }, { gradeLevel: '7th Grade' });
    await click($('[data-ratio-path-go="detective"]'));
    await tick();
    expect(app.state().labView).toBe('missions');
    expect(document.activeElement.name).toMatch(/^ratio-ms-detective-case\d+-v$/);
  });
});

// ---- (4) Grades 4-5 ------------------------------------------------------
describe('(4) grades 4-5 open on times-as-many; Mixtures sits behind Grade 6', () => {
  it('opens grade 5 on a times-as-many problem and grade 6 on the paint lesson', async () => {
    await mount({ _ratioLab: {} }, { gradeLevel: '5th Grade' });
    const pr = P().generateProblem('ratioTable', 'g45', P().defaultPracticeSeed('ratioTable', 'g45'));
    expect(pr.kind).toBe('multCompare');
    expect($('#ratio-challenge-prompt').textContent).toBe(pr.prompt);
    expect($('#ratio-challenge-prompt').textContent).not.toContain('paint');
    await unmount();
    await mount({ _ratioLab: {} }, { gradeLevel: '6th Grade' });
    expect($('#ratio-challenge-prompt').textContent).toBe(P().challenges.ratioTable[0].prompt);
    await unmount();
    // A student who picks the lesson problems keeps them.
    await mount({ _ratioLab: { sourceByMode: { ratioTable: 'fixed' } } }, { gradeLevel: '4th Grade' });
    expect($('#ratio-challenge-prompt').textContent).toBe(P().challenges.ratioTable[0].prompt);
  });

  it('grade 5 missions leave out Mixtures until asked; grade 6 and a teacher lock show it', async () => {
    const app = await mount({ _ratioLab: { labView: 'missions' } }, { gradeLevel: '5th Grade' });
    const tabs = () => $$('[id^="ratio-mission-tab-"]').map((tab) => tab.id.replace('ratio-mission-tab-', ''));
    expect(tabs()).toEqual(['recipe', 'scale', 'detective']);
    expect($('[data-ratio-mission]').getAttribute('data-ratio-mission')).toBe('recipe');
    await click($('[data-ratio-show-grade6]'));
    await tick();
    expect(tabs()).toEqual(['mixture', 'recipe', 'scale', 'detective']);
    expect(app.state().missionTab).toBe('mixture');
    expect(document.activeElement.id).toBe('ratio-mission-tab-mixture');
    await unmount();
    await mount({ _ratioLab: { labView: 'missions' } }, { gradeLevel: '6th Grade' });
    expect(tabs()[0]).toBe('mixture');
    expect($('[data-ratio-show-grade6]')).toBeNull();
    await unmount();
    await mount({ _ratioLab: { labView: 'missions', teacher: { lockMission: 'mixture' } } }, { gradeLevel: '4th Grade' });
    expect($('[data-ratio-mission]').getAttribute('data-ratio-mission')).toBe('mixture');
  });
});

// ---- (5) The Mixtures pour ------------------------------------------------
describe('(5) Mixtures colour pour, hidden until step 3 is settled', () => {
  async function solveMixture(reduced) {
    window.matchMedia = (q) => ({ matches: reduced && /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    const ms = P().buildMission('mixture', 5);
    const { a, b, c, e } = ms.params;
    const app = await mount({ _ratioLab: { labView: 'missions', missionTab: 'mixture', missions: { mixture: { seed: 5, predict: ms.predict.correct } } } }, { gradeLevel: '6th Grade' });
    const step = async (id, value) => { await type(document.getElementById('ratio-ms-mixture-' + id + '-input'), value); await click($('[data-ratio-mission-check="' + id + '"]')); };
    await step('fracA', a + '/' + (a + b));
    await step('fracB', c + '/' + (c + e));
    expect($('[data-ratio-mix-pour]')).toBeNull();
    await click($('input[name="ratio-ms-mixture-compare-choice"][value="' + ms.steps[2].problem.answers[0] + '"]'));
    await click($('[data-ratio-mission-check="compare"]'));
    return { app, ms };
  }

  it('appears only after the comparison is solved; with reduced motion it shows the stirred colours at once', async () => {
    const { ms } = await solveMixture(true);
    const pour = $('[data-ratio-mix-pour]');
    expect(pour).toBeTruthy();
    expect(pour.getAttribute('data-pour-state')).toBe('done');
    const { a, b, c, e } = ms.params;
    const strong = ms.juice ? '#ea580c' : '#dc2626', weak = ms.juice ? '#e0f2fe' : '#ffffff';
    const glassA = $('[data-pour-glass="a"]'), glassB = $('[data-pour-glass="b"]');
    expect(glassA.getAttribute('data-mixed-color')).toBe(P().mixColor(a / (a + b), strong, weak));
    expect(glassB.getAttribute('data-mixed-color')).toBe(P().mixColor(c / (c + e), strong, weak));
    for (const rect of glassA.querySelectorAll('rect')) expect(rect.getAttribute('fill')).toBe(P().mixColor(a / (a + b), strong, weak));
    expect($('#ratio-pour-desc').textContent).toContain(P().fracText(a, a + b) + ' of full strength');
  });

  it('runs a frame loop that stops on unmount, and the colour model is the share of the whole', async () => {
    const frames = [];
    const cancelled = [];
    window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
    window.cancelAnimationFrame = (id) => { cancelled.push(id); };
    await solveMixture(false);
    expect($('[data-ratio-mix-pour]').getAttribute('data-pour-state')).toBe('pouring');
    expect(frames.length).toBeGreaterThan(0);
    await unmount();
    expect(cancelled.length).toBeGreaterThan(0);
    expect(P().mixColor(0, '#ff0000', '#ffffff')).toBe('#ffffff');
    expect(P().mixColor(1, '#ff0000', '#ffffff')).toBe('#ff0000');
    expect(P().mixColor(0.5, '#ff0000', '#ffffff')).toBe('#ff8080');
  });
});
