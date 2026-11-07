// Ratios Lab deep rebuild (2026-11-03): mounted flows. RATIOS_DEEP_FILE points
// the suite at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let tool;
let root = null;
beforeEach(() => { resetStemLab(); tool = loadTool(FILE, 'ratioLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; vi.restoreAllMocks(); });

async function mount(initial, overrides) {
  const out = { latest: null, xp: [], toasts: [], announced: [], errors: [], tools: [] };
  vi.spyOn(console, 'error').mockImplementation((...a) => out.errors.push(a.map(String).join(' ').slice(0, 300)));
  function App() {
    const [state, setState] = React.useState(initial);
    out.latest = state;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (...a) => out.xp.push(a), addToast: (...a) => out.toasts.push(a),
      announceToSR: (m) => out.announced.push(m), setStemLabTool: (id) => out.tools.push(id),
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  out.state = () => out.latest._ratioLab || {};
  return out;
}
const buttons = () => [...document.querySelectorAll('button')];
const byText = (text) => buttons().find((b) => b.textContent === text);
async function click(el) { await React.act(async () => { el.click(); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function answer(value) {
  await type(document.getElementById('ratio-challenge-answer'), value);
  await click(byText('Check answer'));
  const fb = document.getElementById('ratio-challenge-feedback');
  return fb ? fb.textContent : '';
}
async function predict(index) {
  const radios = [...document.querySelectorAll('input[name="ratio-problem-predict"]')];
  await click(radios[index || 0]);
}
function currentPractice(state, mode, band) {
  const seed = (state.practiceSeedByMode || {})[mode + ':' + band];
  return window.RatioLabPure.generateProblem(mode, band, seed);
}

describe('lesson problems: named misconceptions on the first try', () => {
  it('names additive reasoning on the ticket line and keeps a second try open', async () => {
    const app = await mount({ _ratioLab: { mode: 'numberLine' } }, { gradeLevel: '6th Grade' });
    const message = await answer('18');
    expect(message).toContain('You added 3 to both lines');
    expect(app.state().solvedChallenges).toBeUndefined();
    expect(app.state().triesById['line-tickets']).toBe(1);
    expect(document.querySelector('[data-ratio-reveal]')).toBeNull();
    expect(await answer('24')).toContain('Correct!');
    expect(app.xp).toEqual([['ratioLab', 15, 'Ratio Lab challenge']]);
  });

  it('shows the scaffold with units in the model of the problem', async () => {
    await mount({ _ratioLab: { mode: 'numberLine', challengeCursorByMode: { numberLine: 'line-running' } } });
    // 2026-11-04: the unit-rate scaffold is step 1 of the solution, so it appears after the first check.
    expect(document.querySelector('[data-linked-ratio-line="line-running"] [data-line-scaffold]')).toBeNull();
    await answer('40');
    const scaffold = document.querySelector('[data-linked-ratio-line="line-running"] [data-line-scaffold]');
    expect(scaffold.textContent).toBe('For 1 kilometer, the time is 6 minutes.');
    expect(document.querySelector('[data-linked-ratio-line="line-running"] title').textContent).toContain('For 1 kilometer, the time is 6 minutes.');
  });

  it('treats 9:12 for "simplify 18:24" as part way: named, not solved, second try still open', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable', challengeCursorByMode: { ratioTable: 'ratio-simplify' } } });
    const message = await answer('9 to 12');
    expect(message).not.toContain('Correct!');
    expect(message).toContain('not the simplest form yet');
    expect((app.state().solvedChallenges || {})['ratio-simplify']).toBeFalsy();
    expect(app.state().missLog.some((e) => e.misconception === 'partlySimplified')).toBe(true);
    expect(await answer('3 to 4')).toContain('Correct!');
    expect(app.state().solvedChallenges['ratio-simplify']).toBe(true);
  });
});

describe('endless practice', () => {
  it('needs a prediction, gives a second try, then a worked solution that earns no credit', async () => {
    const app = await mount({ _ratioLab: { mode: 'numberLine', sourceByMode: { numberLine: 'practice' }, practiceSeedByMode: { 'numberLine:g6': 4242 } } }, { gradeLevel: '6th Grade' });
    const problem = currentPractice(app.state(), 'numberLine', 'g6');
    expect(document.getElementById('ratio-challenge-prompt').textContent).toBe(problem.prompt);
    // The answer is nowhere on the page before an attempt.
    const key = window.RatioLabPure.canonicalChallengeAnswer(problem);
    expect(document.getElementById('ratio-challenge-answer').value).toBe('');
    expect(document.querySelector('[data-ratio-solution]')).toBeNull();
    expect(await answer('1')).toContain('Make your prediction');
    await predict(0);
    expect(await answer('1')).toContain('Not yet.');
    expect(document.querySelector('[data-ratio-reveal]')).toBeNull();
    const trap = problem.traps.find((tr) => tr.kind === 'additive') || problem.traps[0];
    expect(await answer(String(Math.round(trap.value * 1000) / 1000))).toContain(trap.message);
    // Prediction locked after the first check.
    expect(document.querySelector('input[name="ratio-problem-predict"]').disabled).toBe(true);
    await click(document.querySelector('[data-ratio-reveal]'));
    expect(document.querySelector('[data-ratio-solution]').textContent).toContain(key);
    expect(document.querySelector('[data-ratio-prediction-verdict]')).toBeTruthy();
    const message = await answer(key);
    expect(message).toContain('does not count');
    expect(app.state().solvedPractice).toBeUndefined();
    expect(app.xp).toEqual([]);
    expect(app.state().missLog.filter((e) => e.id === problem.id).length).toBe(2);
  });

  it('pays mastery XP once, after three problems of one kind solved without the solution', async () => {
    const app = await mount({ _ratioLab: { mode: 'numberLine', sourceByMode: { numberLine: 'practice' }, practiceSeedByMode: { 'numberLine:g6': 11 } } }, { gradeLevel: '6th Grade' });
    const ids = new Set();
    for (let i = 0; i < 4; i++) {
      const problem = currentPractice(app.state(), 'numberLine', 'g6');
      ids.add(problem.id);
      await predict(0);
      expect(await answer(window.RatioLabPure.canonicalChallengeAnswer(problem))).toContain('Correct!');
      // Re-checking a solved problem pays nothing more.
      expect(byText('Solved').disabled).toBe(true);
      await click(document.querySelector('[data-ratio-new-problem]'));
    }
    expect(ids.size).toBe(4);
    expect(app.xp).toEqual([['ratioLab', 10, 'Ratio Lab practice mastery']]);
    expect(app.state().kindStats.lineMissing.correct).toBe(4);
    expect(Object.keys(app.state().solvedPractice).length).toBe(4);
  });

  it('fades the worked example as the kind is mastered and never shows this answer', async () => {
    const app = await mount({ _ratioLab: { mode: 'numberLine', sourceByMode: { numberLine: 'practice' }, practiceSeedByMode: { 'numberLine:g6': 77 }, kindStats: { lineMissing: { correct: 1, attempts: 1 } } } });
    const worked = document.querySelector('[data-ratio-worked-example]');
    expect(worked.getAttribute('data-fade-level')).toBe('1');
    expect(worked.querySelectorAll('[data-worked-step="faded"]').length).toBe(1);
    expect(worked.querySelectorAll('[data-worked-step="shown"]').length).toBe(1);
    const problem = currentPractice(app.state(), 'numberLine', 'g6');
    expect(worked.querySelector('p').textContent).not.toBe(problem.prompt);
  });

  it('follows the grade band: grade 8 proportional practice is slope work with a Graphing Calculator handoff', async () => {
    window.StemLab.isRegistered = (id) => id === 'ratioLab' || id === 'graphCalc';
    let seed = 1;
    while (window.RatioLabPure.generateProblem('proportional', 'g8', seed).kind !== 'slope') seed++;
    const app = await mount({ _ratioLab: { mode: 'proportional', sourceByMode: { proportional: 'practice' }, practiceSeedByMode: { 'proportional:g8': seed } } }, { gradeLevel: '8th Grade' });
    const problem = currentPractice(app.state(), 'proportional', 'g8');
    expect(problem.kind).toBe('slope');
    expect(document.querySelector('[data-ratio-mini-graph]')).toBeTruthy();
    expect(document.querySelector('[data-ratio-graph-link]')).toBeNull();
    await predict(0);
    expect(await answer(String(problem.answer))).toContain('Correct!');
    const link = document.querySelector('[data-ratio-graph-link]');
    await click(link);
    expect(app.tools).toEqual(['graphCalc']);
    expect(app.latest.graphCalc.funcs[0].expr).toBe(problem.link.expr);
    expect(app.state().toolsLinked.graphCalc).toBe(true);
  });
});

describe('teacher hooks', () => {
  it('locks the mode, sets the range and the problem set, and summarizes missed items', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable' } }, { isTeacherMode: true, gradeLevel: '6th Grade' });
    expect(document.querySelector('[data-ratio-teacher]')).toBeTruthy();
    await answer('18');
    expect(document.querySelector('[data-ratio-teacher-table]').textContent).toContain('Additive reasoning');
    const lock = document.getElementById('ratio-teacher-lock');
    await React.act(async () => { lock.value = 'percent'; lock.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(app.state().teacher.lockMode).toBe('percent');
    expect(document.querySelector('[aria-label="Learning mode"] [role="tab"][aria-selected="true"]').id).toBe('ratio-tab-percent');
    await click(document.getElementById('ratio-tab-ratioTable'));
    expect(document.querySelector('[aria-label="Learning mode"] [role="tab"][aria-selected="true"]').id).toBe('ratio-tab-percent');
    expect(document.getElementById('ratio-tab-ratioTable').getAttribute('aria-disabled')).toBe('true');
    const set = document.getElementById('ratio-teacher-set');
    await React.act(async () => { set.value = 'practice'; set.dispatchEvent(new Event('change', { bubbles: true })); });
    const band = document.getElementById('ratio-teacher-band');
    await React.act(async () => { band.value = 'g7'; band.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(document.querySelector('[data-ratio-source-practice]')).toBeNull();
    expect(document.body.textContent).toContain('Percent Problems • Endless practice • Grade 7');
    expect(document.querySelector('[data-ratio-new-problem]')).toBeTruthy();
    expect(document.body.textContent).toContain('Level set by your teacher: Grade 7.');
    // Clearing asks first, inline.
    await click(byText('Clear the summary'));
    expect(app.state().missLog.length).toBe(1);
    await click(byText('Yes, clear it'));
    expect(app.state().missLog).toEqual([]);
  });

  it('hides the panel from students and can switch the reveal off', async () => {
    await mount({ _ratioLab: { mode: 'ratioTable' } });
    expect(document.querySelector('[data-ratio-teacher]')).toBeNull();
    resetStemLab(); tool = loadTool(FILE, 'ratioLab');
    await React.act(async () => root.unmount()); root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ _ratioLab: { mode: 'ratioTable', teacher: { allowReveal: false } } });
    await answer('7');
    await answer('8');
    expect(document.querySelector('[data-ratio-reveal]')).toBeNull();
  });
});

describe('explore: predict before the model shows the result', () => {
  it('hides the scaled ratio until the prediction is checked and names an additive prediction', async () => {
    const app = await mount({ _ratioLab: { mode: 'ratioTable', explorePredictFirst: true } });
    expect(document.querySelector('[data-ratio-row="multiply"][style*="background"] td:last-child')).toBeTruthy();
    const hiddenCell = [...document.querySelectorAll('[data-ratio-row="multiply"]')].find((row) => row.textContent.includes('(selected)'));
    expect(hiddenCell.lastChild.textContent).toBe('?');
    await type(document.getElementById('ratio-explore-predict-ratioTable'), '14');
    await click(byText('Check my prediction'));
    expect(document.querySelector('[data-explore-prediction-feedback="ratioTable"]').textContent).toContain('adds the same amount');
    expect(document.body.textContent).toContain('12:20');
    expect(app.state().explorePredictions.ratioTable.checked).toBe(true);
  });

  it('shows the scale-down and unit-rate rows and the tape diagram', async () => {
    await mount({ _ratioLab: { mode: 'ratioTable', ratioA: 12, ratioB: 18, ratioFactor: 2 } });
    expect(document.querySelectorAll('[data-ratio-row="divide"]').length).toBe(3);
    expect(document.querySelector('[data-ratio-row="unitFirst"]').textContent).toContain('1.5');
    expect(document.querySelector('[data-tape-summary]').textContent).toContain('60 split into 5 equal units is 12 per unit');
    expect(document.querySelector('[data-ratio-tape="ratio-tape-explorer"] desc').textContent).toContain('Each unit is worth 12.');
  });

  for (const mode of ['numberLine', 'percent', 'proportional']) {
    it('gates the ' + mode + ' result behind a prediction', async () => {
      await mount({ _ratioLab: { mode, explorePredictFirst: true } });
      expect(document.querySelector('[data-explore-prediction="' + mode + '"]')).toBeTruthy();
      await click(byText('Show without predicting'));
      expect(document.querySelector('[data-explore-prediction-feedback="' + mode + '"]')).toBeTruthy();
    });
  }
});

describe('robustness', () => {
  it('mounts every mode, source, band and theme without console errors, and survives hostile saved state', async () => {
    const states = [];
    for (const mode of ['ratioTable', 'numberLine', 'unitRates', 'percent', 'proportional']) {
      for (const source of ['fixed', 'practice']) {
        for (const grade of ['4th Grade', '6th Grade', '7th Grade', '8th Grade']) states.push([{ mode, sourceByMode: { [mode]: source }, explorePredictFirst: source === 'practice' }, { gradeLevel: grade }]);
      }
    }
    states.push([{ mode: 'percent', teacher: 'x', missLog: 'bad', predictById: [], kindStats: null, triesById: 5, practiceSeedByMode: { 'percent:g6': -3 }, revealedItems: 'y', solvedPractice: 7, band: 'nope', sourceByMode: [] }, {}]);
    states.push([{ mode: 'nonsense', challengeCursorByMode: { ratioTable: 99 }, challengeIndex: 'x' }, { isDark: true }]);
    states.push([{ mode: 'unitRates' }, { isContrast: true, isTeacherMode: true }]);
    for (const [state, ctx] of states) {
      const app = await mount({ _ratioLab: state }, ctx);
      expect(document.getElementById('ratio-challenge-prompt').textContent.length, JSON.stringify(state)).toBeGreaterThan(10);
      expect(document.body.textContent).not.toMatch(/NaN|undefined|\{\w+\}/);
      document.querySelectorAll('details').forEach((el) => { el.open = true; });
      expect(app.errors, JSON.stringify(state)).toEqual([]);
      await React.act(async () => root.unmount()); root = null;
      document.body.innerHTML = '<div id="root"></div>';
      vi.restoreAllMocks();
    }
  }, 30000); // stage C: 43 full mounts; the 5 s default timed out under shared-machine load

  it('every SVG in every mode has an accessible name, and the tab panel wraps the problem', async () => {
    for (const mode of ['ratioTable', 'numberLine', 'unitRates', 'percent', 'proportional']) {
      await mount({ _ratioLab: { mode } });
      for (const svg of document.querySelectorAll('svg')) {
        const named = svg.getAttribute('aria-hidden') === 'true' || svg.getAttribute('aria-label') || (svg.getAttribute('aria-labelledby') || '').split(' ').every((id) => document.getElementById(id));
        expect(!!named, mode).toBe(true);
      }
      expect(document.querySelector('[role="tabpanel"] #ratio-challenge-prompt')).toBeTruthy();
      await React.act(async () => root.unmount()); root = null;
      document.body.innerHTML = '<div id="root"></div>';
      vi.restoreAllMocks();
    }
  });
});
