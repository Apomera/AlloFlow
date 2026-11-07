// Independent hunt of the Ratio Lab engagement build (2026-11-04). Each test
// failed on the build as it stood (RATIOS_DEEP_FILE points the suite at a copy).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let tool;
let root = null;
beforeEach(() => { resetStemLab(); tool = loadTool(FILE, 'ratioLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; vi.restoreAllMocks(); });

async function mount(initial, overrides) {
  const out = { latest: null, xp: [], announced: [] };
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
const $ = (sel) => document.querySelector(sel);
const P = () => window.RatioLabPure;
const byText = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent === text);
async function click(el) { await React.act(async () => { el.click(); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const answerBox = () => document.getElementById('ratio-challenge-answer');
const feedback = () => document.getElementById('ratio-challenge-feedback').textContent;
const ticketCell = (r, c) => document.getElementById('ratio-model-cell-line-tickets-' + r + '-' + c);
async function fillTickets(rows, find) {
  for (let r = 0; r < rows.length; r++) {
    if (r > 0) await click($('[data-model-add-row]'));
    await type(ticketCell(r, 0), rows[r][0]);
    await type(ticketCell(r, 1), rows[r][1]);
  }
  await type($('[data-model-find]'), find);
}
const LINE = { _ratioLab: { mode: 'numberLine' } };

describe('the student-built model never grades a candidate answer', () => {
  it('a wrong check does not say whether the row on the Find amount is right', async () => {
    await mount(LINE, { gradeLevel: '6th Grade' });
    await fillTickets([['5', '15'], ['8', '24']], '8');
    await type(answerBox(), '1');
    await click(byText('Check answer'));
    expect(feedback()).toContain('Not yet.');
    expect(feedback()).not.toContain('Every row keeps the same ratio');
    expect(feedback()).not.toContain('Your table');
  });

  it('six candidates in one check get no verdicts, while a row that is not a candidate still does', async () => {
    await mount(LINE, { gradeLevel: '6th Grade' });
    await fillTickets([['5', '15'], ['8', '21'], ['8', '24'], ['6', '8']], '8');
    await type(answerBox(), '1');
    await click(byText('Check answer'));
    expect(feedback()).toContain('Row 4 does not keep the same ratio');
    expect(feedback()).not.toMatch(/Row [23] /);
  });

  it('a right answer judges every row, including the Find row', async () => {
    const app = await mount(LINE, { gradeLevel: '6th Grade' });
    await fillTickets([['5', '15'], ['8', '24']], '8');
    await type(answerBox(), '24');
    await click(byText('Check answer'));
    expect(feedback()).toContain('Every row keeps the same ratio as the problem.');
    expect($('[data-model-row="1"] th').textContent).toBe('Row 2 (× 1.6)');
    expect(app.xp).toEqual([['ratioLab', 15, 'Ratio Lab challenge']]);
  });

  it('after a wrong check, typing does not judge a row through its factor label', async () => {
    await mount(LINE, { gradeLevel: '6th Grade' });
    await fillTickets([['5', '15'], ['8', '23']], '8');
    await type(answerBox(), '1');
    await click(byText('Check answer'));
    await type(ticketCell(1, 1), '24');
    expect($('[data-model-row="1"] th').textContent).toBe('Row 2');
  });

  it('the unit-rate scaffold waits when the unit rate is the answer, and still helps otherwise', async () => {
    let seed = 1, problem = null;
    for (let n = 0; n < 3000 && !problem; n++) {
      seed = P().seedForKind('numberLine', 'g8', 'lineMissing', seed * 7 + 13 + n, {});
      const pr = P().generateProblem('numberLine', 'g8', seed);
      const sc = P().numberLineScaffold([pr.model.labels, pr.model.rows], pr);
      if (sc && Math.abs(sc.shown - pr.answer) < 1e-6) problem = pr;
    }
    expect(problem).toBeTruthy();
    await mount({ _ratioLab: { mode: 'numberLine', sourceByMode: { numberLine: 'practice' }, practiceSeedByMode: { 'numberLine:g8': seed }, predictById: { [problem.id]: 'x' } } }, { gradeLevel: '8th Grade' });
    await type(answerBox(), String(problem.answer + 1000));
    await click(byText('Check answer'));
    expect(feedback()).toContain('Not yet.');
    const line = $('[data-linked-ratio-line]');
    expect(line.querySelector('[data-line-scaffold]')).toBeNull();
    expect(line.querySelector('title').textContent).not.toContain(String(problem.answer));
    await type(answerBox(), String(problem.answer));
    await click(byText('Check answer'));
    expect($('[data-linked-ratio-line] [data-line-scaffold]')).toBeTruthy();
  });
});

describe('checkModelTable', () => {
  const spec = () => P().buildableTableSpec([['A', 'B'], [[0, 0], [5, 15], [8, '?']]], { line: true });
  it('a row of zeros is on the table, on a model that starts at zero and on one that does not', () => {
    const r = P().checkModelTable(spec(), { rows: [['0', '0'], ['5', '15']], find: '8' });
    expect(r.ok).toBe(true);
    expect(r.rows[0].factor).toBeNull();
    const plain = P().buildableTableSpec([['A', 'B'], [[3, 3], ['?', 20]]], {});
    expect(P().checkModelTable(plain, { rows: [['0', '0'], ['3', '3']], find: '20' }).ok).toBe(true);
    expect(P().checkModelTable(spec(), { rows: [['0', '5'], ['5', '15']], find: '8' }).ok).toBe(false);
  });

  it('a negative amount is not an equal ratio', () => {
    const r = P().checkModelTable(spec(), { rows: [['-5', '-15'], ['5', '15']], find: '8' });
    expect(r.rows[0].status).toBe('notEquivalent');
    expect(r.rows[0].factor).toBeNull();
    expect(r.ok).toBe(false);
  });

  it('a correct answer with a 0:0 row is not told that row is wrong', async () => {
    await mount(LINE, { gradeLevel: '6th Grade' });
    await fillTickets([['0', '0'], ['5', '15']], '8');
    await type(answerBox(), '24');
    await click(byText('Check answer'));
    expect(feedback()).not.toContain('does not keep');
    expect(feedback()).toContain('Every row keeps the same ratio as the problem.');
  });
});

describe('free exploration', () => {
  it('does not open on the percent and amount a tax, tip, discount or markup problem is about', () => {
    const bad = [];
    for (const band of P().bands) for (let seed = 1; seed <= 3000; seed++) {
      const pr = P().generateProblem('percent', band, seed);
      if (pr.kind !== 'taxTip' && pr.kind !== 'discountMarkup') continue;
      const def = P().exploreDefaultsFor('percent', pr);
      const given = pr.prompt.match(/\d+(?:\.\d+)?/g).map(Number);
      if (given.includes(def[0]) && given.includes(def[1])) bad.push(pr.prompt);
    }
    expect(bad).toEqual([]);
    const meal = P().buildKindProblem('taxTip', { P: 80, r: 25, ctx: 'tip' }, undefined, { id: 'x' });
    expect(P().exploreLeaks('percent', [25, 80], meal)).toBe(true);
    expect(P().exploreLeaks('percent', [40, 70], meal)).toBe(false);
  });

  it('tabbing through the fields saves nothing, so the defaults keep following the open problem', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable' } }, { gradeLevel: '6th Grade' });
    const inputs = [...document.querySelectorAll('[data-ratio-exploration] input[type="number"]')];
    expect(inputs.length).toBeGreaterThan(2);
    await React.act(async () => { for (const input of inputs) { input.focus(); input.blur(); } });
    expect(app.state().ratioA).toBeUndefined();
    expect(app.state().ratioB).toBeUndefined();
    expect(app.state().ratioFactor).toBeUndefined();
    expect(app.state().tapeTotal).toBeUndefined();
  });

  it('a typed value is still saved on blur', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable' } }, { gradeLevel: '6th Grade' });
    const input = $('[data-ratio-exploration] input[type="number"]');
    await React.act(async () => { input.focus(); });
    await type(input, '9');
    await React.act(async () => { $('[data-ratio-exploration] input[type="number"]').blur(); });
    expect(app.state().ratioA).toBe(9);
    expect(app.state().ratioADraft).toBeNull();
  });
});

describe('teacher locks and the Practice | Missions tabs', () => {
  it('a locked mission opens the Missions tab; the student can still go to Practice', async () => {
    const app = await mount({ _ratioLab: { teacher: { lockMission: 'detective' } } }, { gradeLevel: '6th Grade' });
    expect($('[data-ratio-mission]').getAttribute('data-ratio-mission')).toBe('detective');
    await click(document.getElementById('ratio-view-tab-practice'));
    expect(app.state().labView).toBe('practice');
    expect($('[data-ratio-missions]')).toBeNull();
    expect($('[data-ratio-exploration]')).toBeTruthy();
  });

  it('no lock still opens on Practice', async () => {
    await mount({ _ratioLab: {} }, { gradeLevel: '6th Grade' });
    expect($('[data-ratio-missions]')).toBeNull();
  });

  it('grade 5 under a teacher lock is not offered the Grade 6 mission', async () => {
    await mount({ _ratioLab: { labView: 'missions', teacher: { lockMission: 'recipe' } } }, { gradeLevel: '5th Grade' });
    expect($('[data-ratio-mission]').getAttribute('data-ratio-mission')).toBe('recipe');
    expect($('[data-ratio-show-grade6]')).toBeNull();
  });
});

describe('small truths and reach', () => {
  it('a solved percent tape reads with its percent sign', async () => {
    const seed = P().seedForKind('ratioTable', 'g7', 'mixturePercent', 77, {});
    const pr = P().generateProblem('ratioTable', 'g7', seed);
    expect(pr.kind).toBe('mixturePercent');
    const units = pr.tape.rows.map((r) => r.units);
    await mount({ _ratioLab: { mode: 'ratioTable', sourceByMode: { ratioTable: 'practice' }, practiceSeedByMode: { 'ratioTable:g7': seed }, solvedPractice: { [pr.id]: true }, modelBuild: { [pr.id]: { units, touched: true } } } }, { gradeLevel: '7th Grade' });
    expect($('[data-ratio-problem-model] [data-ratio-tape] desc').textContent).toContain(pr.answer + '%');
  });

  it('the built table has no fixed width that pushes its second column off a 320 px phone', async () => {
    await mount(LINE, { gradeLevel: '6th Grade' });
    expect($('[data-ratio-model-table]').style.minWidth).toBe('');
  });

  it('typing the problem into free exploration works as a calculator and earns nothing (decision for Aaron)', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable' } }, { gradeLevel: '6th Grade' });
    const fields = () => [...document.querySelectorAll('[data-ratio-exploration] input[type="number"]')];
    await type(fields()[0], '3'); await type(fields()[1], '5'); await type(fields()[2], '4');
    expect($('[data-ratio-exploration]').textContent).toContain('12:20');
    expect(app.xp).toEqual([]);
    expect(app.state().solvedChallenges).toBeUndefined();
    expect(app.state().kindStats).toBeUndefined();
  });

  it('contrast theme: the selected explore row and the Next badge do not sit on the yellow the host forces their text to', async () => {
    await mount({ _ratioLab: { mode: 'ratioTable', pathExpanded: true } }, { gradeLevel: '6th Grade', isContrast: true, isDark: true });
    const row = [...document.querySelectorAll('[data-ratio-table] tbody tr')].find((tr) => /selected/.test(tr.textContent));
    expect(row.style.background).not.toMatch(/ffff00|255, 255, 0|yellow/i);
    expect(row.style.outline).toContain('2px solid');
    const badge = [...document.querySelectorAll('[data-ratio-path] span')].find((n) => n.textContent === 'Next');
    expect(badge.style.background).not.toMatch(/ffff00|255, 255, 0|yellow/i);
  });

  it('the pour draws each liquid level as a line, level with the top of the liquid', async () => {
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    await mount({ _ratioLab: { labView: 'missions', missionTab: 'mixture', missions: { mixture: { seed: 5, solved: { fracA: true, fracB: true, compare: true } } } } }, { gradeLevel: '6th Grade' });
    for (const id of ['a', 'b']) {
      const glass = $('[data-pour-glass="' + id + '"]');
      const top = Math.min(...[...glass.querySelectorAll('rect')].map((r) => Number(r.getAttribute('y'))));
      expect(Number(glass.querySelector('[data-pour-surface]').getAttribute('y1'))).toBeCloseTo(top, 6);
    }
    delete window.matchMedia;
  });

  it('the explore table can be reached by keyboard when it scrolls', async () => {
    await mount({ _ratioLab: { mode: 'ratioTable' } }, { gradeLevel: '6th Grade' });
    const region = $('[data-ratio-table]').parentElement;
    expect(region.tabIndex).toBe(0);
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe($('[data-ratio-table] caption').textContent);
  });

  it('the recipe table can be reached by keyboard when it scrolls', async () => {
    await mount({ _ratioLab: { labView: 'missions', missionTab: 'recipe' } }, { gradeLevel: '6th Grade' });
    const region = $('[data-ratio-recipe-table]').parentElement;
    expect(region.tabIndex).toBe(0);
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe($('[data-ratio-recipe-table] caption').textContent);
  });
});
