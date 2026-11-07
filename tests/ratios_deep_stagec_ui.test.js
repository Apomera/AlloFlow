// Ratios Lab stage C (2026-11-03): the mounted "Start here" path, band-ordered
// tabs, the shared hint ladder in missions, wrapped tape labels and the
// Unit Converter link card. RATIOS_DEEP_FILE points the suite at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let tool;
let root = null;
beforeEach(() => { resetStemLab(); tool = loadTool(FILE, 'ratioLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; vi.restoreAllMocks(); });

async function mount(initial, overrides) {
  // 2026-11-04: missions sit behind the Missions tab; a test that seeds mission state opens it.
  const seeded = initial && initial._ratioLab;
  if (seeded && seeded.labView === undefined && (seeded.missionTab !== undefined || seeded.missions !== undefined)) initial = Object.assign({}, initial, { _ratioLab: Object.assign({ labView: 'missions' }, seeded) });
  const out = { latest: null, xp: [], announced: [], errors: [], tools: [] };
  vi.spyOn(console, 'error').mockImplementation((...a) => out.errors.push(a.map(String).join(' ').slice(0, 300)));
  function App() {
    const [state, setState] = React.useState(initial);
    out.latest = state;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, awardXP: (...a) => out.xp.push(a), addToast: () => {},
      announceToSR: (m) => out.announced.push(m), setStemLabTool: (id) => out.tools.push(id),
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  out.state = () => out.latest._ratioLab || {};
  return out;
}
async function remount() { if (root) await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>'; vi.restoreAllMocks(); }
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const byText = (text, scope) => [...(scope || document).querySelectorAll('button')].find((b) => b.textContent === text);
async function click(el) { await React.act(async () => { el.click(); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const P = () => window.RatioLabPure;
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const stepIds = () => $$('[data-path-step]').map((li) => li.getAttribute('data-path-step'));
const modeTabs = () => $$('[aria-label="Learning mode"] [role="tab"]').map((tab) => tab.id.replace('ratio-tab-', ''));
function answerFor(problem) {
  if (problem.answer != null) return String(problem.answer);
  return String(problem.answers[0]);
}

describe('Start here path', () => {
  it('grades 4-5: times as many, then the tape diagram opens with the model shown, and a credited solve ticks the step', async () => {
    // 2026-11-04: the path is folded to its next step; these checks open the full list.
    const app = await mount({ _ratioLab: { pathExpanded: true } }, { gradeLevel: '4th Grade' });
    expect($('[data-ratio-path]').getAttribute('data-ratio-path')).toBe('g45');
    expect($('#ratio-path-heading').textContent).toBe('Start here: your path for Grades 4–5');
    expect(stepIds()).toEqual(['timesMultiply', 'timesTape', 'ratioTableGroups', 'doubleLine']);
    expect($('[data-ratio-path-progress]').textContent).toBe('0 of 4 steps done');
    const go = $('[data-ratio-path-go="timesTape"]');
    expect(go.getAttribute('aria-label')).toBe('Start step 2: Times as many with a tape diagram');
    await click(go);
    await tick();
    const s = app.state();
    expect(s.mode).toBe('ratioTable');
    expect(s.sourceByMode.ratioTable).toBe('practice');
    const problem = P().generateProblem('ratioTable', 'g45', s.practiceSeedByMode['ratioTable:g45']);
    expect(problem.kind).toBe('multCompareDivide');
    // The model is open and its tape diagram is drawn; focus moved to the problem.
    const model = $('[data-ratio-problem-model]');
    expect(model.open).toBe(true);
    expect(model.querySelector('[data-ratio-tape]')).toBeTruthy();
    // 2026-11-04: Start lands on the first task: here the required prediction.
    expect(document.activeElement.name).toBe('ratio-problem-predict');
    // Commit a prediction, solve it: the step ticks from kindStats.
    await click($('input[name="ratio-problem-predict"]'));
    await type(document.getElementById('ratio-challenge-answer'), answerFor(problem));
    await click(byText('Check answer'));
    expect(document.getElementById('ratio-challenge-feedback').textContent).toContain('Correct!');
    expect($('[data-path-step="timesTape"]').getAttribute('data-done')).toBe('true');
    expect($('[data-path-step="timesTape"]').textContent).toContain('(done)');
    expect($('[data-ratio-path-progress]').textContent).toBe('1 of 4 steps done');
    expect($('[data-ratio-path-go="timesTape"]').textContent).toBe('Practise again');
    expect(app.errors).toEqual([]);
  });

  it('a revealed solution never ticks a step', async () => {
    const seed = P().seedForKind('ratioTable', 'g45', 'multCompare', 5, {});
    const problem = P().generateProblem('ratioTable', 'g45', seed);
    const app = await mount({ _ratioLab: { pathExpanded: true, mode: 'ratioTable', sourceByMode: { ratioTable: 'practice' }, practiceSeedByMode: { 'ratioTable:g45': seed } } }, { gradeLevel: '5th Grade' });
    await click($('input[name="ratio-problem-predict"]'));
    const ans = document.getElementById('ratio-challenge-answer');
    await type(ans, '9999'); await click(byText('Check answer'));
    await type(ans, '9998'); await click(byText('Check answer'));
    await click($('[data-ratio-reveal]'));
    await type(ans, answerFor(problem)); await click(byText('Check answer'));
    expect(document.getElementById('ratio-challenge-feedback').textContent).toContain('does not count');
    expect($('[data-path-step="timesMultiply"]').getAttribute('data-done')).toBe('false');
    expect(app.state().kindStats).toBeUndefined();
  });

  it('grade 6: ratio tables, unit rates, percents, then the mixtures mission', async () => {
    const app = await mount({ _ratioLab: { pathExpanded: true, kindStats: { unitRate: { correct: 2, attempts: 2 } }, missionsDone: { 'mixture:5': true } } }, { gradeLevel: '6th Grade' });
    expect(stepIds()).toEqual(['ratioTables', 'unitRates', 'percents', 'mixtures']);
    expect($$('[data-path-step]').map((li) => li.getAttribute('data-done'))).toEqual(['false', 'true', 'false', 'true']);
    // The first undone step is marked Next and is the primary button.
    expect($('[data-path-step="ratioTables"]').textContent).toContain('Next');
    await click($('[data-ratio-path-go="percents"]'));
    expect(app.state().mode).toBe('percent');
    expect(P().generateProblem('percent', 'g6', app.state().practiceSeedByMode['percent:g6']).kind).toBe('percentPart');
    await click($('[data-ratio-path-go="mixtures"]'));
    await tick();
    expect(app.state().missionTab).toBe('mixture');
    // 2026-11-04: a mission step opens the Missions tab and focuses its first control (the prediction).
    expect(app.state().labView).toBe('missions');
    expect(document.activeElement.name).toBe('ratio-ms-predict-mixture');
  });

  it('grade 7 opens on its core tabs: proportional first, the detective mission first', async () => {
    const app = await mount({ _ratioLab: { pathExpanded: true } }, { gradeLevel: '7th Grade' });
    expect(stepIds()).toEqual(['detective', 'percentChange', 'scaleDrawings', 'recipes']);
    expect(modeTabs()).toEqual(['proportional', 'percent', 'numberLine', 'ratioTable', 'unitRates']);
    expect($('[aria-label="Learning mode"] [role="tab"][aria-selected="true"]').id).toBe('ratio-tab-proportional');
    // 2026-11-04: missions sit behind their own tab.
    expect($('[data-ratio-missions]')).toBeNull();
    await click(document.getElementById('ratio-view-tab-missions'));
    expect($('[id^="ratio-mission-tab-"]').id).toBe('ratio-mission-tab-detective');
    expect($('[data-ratio-mission]').getAttribute('data-ratio-mission')).toBe('detective');
    await click($('[data-ratio-path-go="percentChange"]'));
    expect(P().generateProblem('percent', 'g7', app.state().practiceSeedByMode['percent:g7']).kind).toBe('percentChange');
    // Arrow keys follow the band order.
    const first = document.getElementById('ratio-tab-proportional');
    await click(first);
    await React.act(async () => { first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(app.state().mode).toBe('percent');
    expect(app.errors).toEqual([]);
  });

  it('grade 8: slope as a rate first', async () => {
    const app = await mount({ _ratioLab: { pathExpanded: true } }, { gradeLevel: '8th Grade' });
    expect(stepIds()).toEqual(['slopeRate', 'compareSlopes', 'kFromGraph', 'detectiveReview']);
    await click($('[data-ratio-path-go="slopeRate"]'));
    const s = app.state();
    expect(s.mode).toBe('proportional');
    expect(P().generateProblem('proportional', 'g8', s.practiceSeedByMode['proportional:g8']).kind).toBe('slope');
    expect($('#ratio-challenge-prompt').textContent).toBe(P().generateProblem('proportional', 'g8', s.practiceSeedByMode['proportional:g8']).prompt);
  });

  it('respects teacher locks and lesson-only sets, and can be hidden', async () => {
    let app = await mount({ _ratioLab: { pathExpanded: true, teacher: { lockMode: 'percent', lockMission: 'recipe' } } }, { gradeLevel: '6th Grade' });
    expect($('[data-ratio-path-go="ratioTables"]').disabled).toBe(true);
    expect($('[data-path-step="ratioTables"]').textContent).toContain('Your teacher has set the mode');
    expect($('[data-ratio-path-go="mixtures"]').disabled).toBe(true);
    expect($('[data-ratio-path-go="percents"]').disabled).toBe(false);
    await remount();
    app = await mount({ _ratioLab: { pathExpanded: true, teacher: { problemSet: 'fixed' } } }, { gradeLevel: '6th Grade' });
    await click($('[data-ratio-path-go="unitRates"]'));
    expect(app.state().mode).toBe('unitRates');
    expect(app.state().sourceByMode).toBeUndefined();
    expect($('#ratio-challenge-prompt').textContent).toBe(P().challenges.unitRates[0].prompt);
    const toggle = $('[data-ratio-path-toggle]');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await click(toggle);
    expect($('#ratio-path-steps')).toBeNull();
    expect($('[data-ratio-path-toggle]').getAttribute('aria-expanded')).toBe('false');
    expect($('[data-ratio-path-toggle]').textContent).toBe('Show all 4 steps');
    // Folded, the path still offers its next step.
    expect($('[data-ratio-path-next]')).toBeTruthy();
  });

  it('says so when the whole path is done', async () => {
    await mount({ _ratioLab: { kindStats: { slope: { correct: 1 }, compareSlopes: { correct: 1 }, kFromGraph: { correct: 3 } }, missionsDone: { 'detective:9': true } } }, { gradeLevel: '8th Grade' });
    expect($('[data-ratio-path-complete]').textContent).toContain('Path complete!');
    expect($('[data-ratio-path-progress]').textContent).toBe('4 of 4 steps done');
  });
});

describe('mission steps use the same hint ladder as the problem', () => {
  it('hint 1 is the mission strategy, hint 2 the step hint, and the reveal sits in the ladder after two tries', async () => {
    const ms = P().buildMission('recipe', 11);
    await mount({ _ratioLab: { missionTab: 'recipe', missions: { recipe: { seed: 11, predict: ms.predict.correct } } } });
    const ladder = $('[data-ratio-hint-ladder="ratio-ms-recipe-factor-hints"]');
    const btn = byText('Show hint 1', ladder);
    expect(btn.getAttribute('aria-controls')).toBe('ratio-ms-recipe-factor-hints');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    await click(btn);
    expect(document.getElementById('ratio-ms-recipe-factor-hints').textContent).toContain('Find the scale factor first');
    await click(byText('Show hint 2', ladder));
    expect(document.getElementById('ratio-ms-recipe-factor-hints').textContent).toContain(ms.steps[0].problem.hint);
    // The answer itself is not in the hints.
    expect(document.getElementById('ratio-ms-recipe-factor-hints').textContent).not.toContain('Answer:');
    const input = document.getElementById('ratio-ms-recipe-factor-input');
    await type(input, '99'); await click($('[data-ratio-mission-check="factor"]'));
    expect(ladder.querySelector('[data-ratio-mission-reveal]')).toBeNull();
    await type(input, '98'); await click($('[data-ratio-mission-check="factor"]'));
    expect(ladder.querySelector('[data-ratio-mission-reveal="factor"]')).toBeTruthy();
    // The main problem's ladder still looks the same (2026-11-04: on the Practice tab).
    await click(document.getElementById('ratio-view-tab-practice'));
    expect($('[data-ratio-hint-ladder="ratio-challenge-hints"]')).toBeTruthy();
  });

  it('detective cases get the detective hint', async () => {
    const ms = P().buildMission('detective', 9);
    await mount({ _ratioLab: { missionTab: 'detective', missions: { detective: { seed: 9 } } } }, { gradeLevel: '7th Grade' });
    const id = 'ratio-ms-detective-' + ms.cases[0].id + '-hints';
    const ladder = $('[data-ratio-hint-ladder="' + id + '"]');
    await click(byText('Show hint 1', ladder));
    await click(byText('Show hint 2', ladder));
    expect(document.getElementById(id).textContent).toContain('does 0 of x go with 0 of y');
  });
});

describe('tape-diagram labels', () => {
  it('wrap onto two lines instead of being cut at 12 characters, with the full text in the description', async () => {
    const seed = P().seedForKind('ratioTable', 'g45', 'multCompare', 3, {});
    const problem = P().generateProblem('ratioTable', 'g45', seed);
    const long = problem.params.ctx === 'stickers' ? { 'stem.ratios.tape_sam': 'Samuel the sticker collector' } : { 'stem.ratios.tape_red_ribbon': 'The long red satin ribbon' };
    const full = Object.values(long)[0];
    await mount({ _ratioLab: { mode: 'ratioTable', sourceByMode: { ratioTable: 'practice' }, practiceSeedByMode: { 'ratioTable:g45': seed }, pathOpenModel: problem.id } },
      { gradeLevel: '4th Grade', t: (key, fallback) => long[key] || fallback });
    const label = $('[data-ratio-problem-model] [data-tape-label="0"]');
    const lines = [...label.querySelectorAll('tspan')].map((s) => s.textContent);
    expect(lines.length).toBe(2);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(14);
    expect(lines.join(' ').replace('…', '')).not.toBe(full.slice(0, 12));
    expect(full.startsWith(lines.join(' ').replace('…', ''))).toBe(true);
    expect($('[data-ratio-problem-model] [data-ratio-tape] desc').textContent).toContain(full);
    // The bars start right after the label column and stay inside the drawing.
    for (const rect of $$('[data-ratio-problem-model] [data-ratio-tape] rect')) {
      expect(Number(rect.getAttribute('x'))).toBeGreaterThanOrEqual(56);
      expect(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'))).toBeLessThanOrEqual(480.001);
    }
  });
});

describe('Unit Converter link card', () => {
  it('is a plain link until there is a solved rate, then hands the value over', async () => {
    window.StemLab.isRegistered = (id) => id === 'ratioLab' || id === 'unitConvert';
    const app = await mount({ _ratioLab: { mode: 'unitRates', challengeCursorByMode: { unitRates: 'unit-speed' } }, unitConvert: { badges: { a: true } } });
    const card = () => $('[data-ratio-link="unitConvert"]');
    expect(card().textContent).toContain('Open the Unit Converter');
    expect(card().hasAttribute('data-ratio-link-handoff')).toBe(false);
    expect($('[data-ratio-link-plain]')).toBeNull();
    await type(document.getElementById('ratio-challenge-answer'), '60');
    await click(byText('Check answer'));
    expect(card().textContent).toContain('Convert 60 mph to km/h in the Unit Converter');
    await click(card());
    expect(app.tools).toEqual(['unitConvert']);
    expect(app.latest.unitConvert).toEqual({ badges: { a: true }, category: 'speed', value: 60, valueDraft: '60', fromUnit: 'mph', toUnit: 'km/h', tab: 'convert' });
    // The plain option stays available and passes nothing.
    await click($('[data-ratio-link-plain="unitConvert"]'));
    expect(app.tools).toEqual(['unitConvert', 'unitConvert']);
  });

  it('uses a solved mission rate when the problem has none', async () => {
    window.StemLab.isRegistered = (id) => id === 'ratioLab' || id === 'unitConvert';
    const ms = P().buildMission('scale', 3);
    const app = await mount({ _ratioLab: { missionTab: 'scale', missions: { scale: { seed: 3, solved: { length: true } } } } });
    expect($('[data-ratio-link="unitConvert"]').textContent).toContain('Convert ' + (ms.l * ms.k1) + ' m to ft');
    await click($('[data-ratio-link="unitConvert"]'));
    expect(app.latest.unitConvert).toEqual({ category: 'length', value: ms.l * ms.k1, valueDraft: String(ms.l * ms.k1), fromUnit: 'm', toUnit: 'ft', tab: 'convert' });
  });
});

describe('robustness', () => {
  it('mounts the path in every band and theme with hostile progress data', async () => {
    const states = [];
    for (const grade of ['3rd Grade', '4th Grade', '6th Grade', '7th Grade', '8th Grade', 'College', undefined]) {
      states.push([{}, { gradeLevel: grade }], [{ pathHidden: true }, { gradeLevel: grade, isDark: true }], [{ kindStats: 'x', missionsDone: [] }, { gradeLevel: grade, isContrast: true, isTeacherMode: true }]);
    }
    states.push([{ kindStats: { slope: null, multCompare: { correct: -2 } }, missionsDone: { 'detective:1': 'yes' }, pathOpenModel: 7, band: 'g8' }, {}]);
    for (const [state, ctx] of states) {
      const app = await mount({ _ratioLab: state }, ctx);
      expect($('[data-ratio-path]'), JSON.stringify([state, ctx])).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/NaN|undefined|\{\w+\}/);
      for (const btn of $$('[data-ratio-path] button')) expect((btn.getAttribute('aria-label') || btn.textContent).trim().length).toBeGreaterThan(0);
      expect(app.errors, JSON.stringify(state)).toEqual([]);
      await remount();
    }
  }, 30000);
});
