// Ratios Lab stage B (2026-11-03): mounted missions, AI hint, Unit Converter
// handoff and teacher hooks. RATIOS_DEEP_FILE points the suite at another copy.
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
async function remount() { if (root) await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>'; vi.restoreAllMocks(); }
const $ = (sel) => document.querySelector(sel);
const byText = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent === text);
async function click(el) { await React.act(async () => { el.click(); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
const P = () => window.RatioLabPure;
const fb = (step) => ($('[data-ratio-mission-feedback="' + step + '"]') || {}).textContent || '';
async function stepAnswer(mid, step, value) {
  await type(document.getElementById('ratio-ms-' + mid + '-' + step + '-input'), value);
  await click($('[data-ratio-mission-check="' + step + '"]'));
  return fb(step);
}
async function pick(name, value) { await click($('input[name="' + name + '"][value="' + value + '"]')); }
const num = (v) => String(Math.round(v * 10000) / 10000);

describe('mixture mission: tape diagrams and the additive-comparison misconception', () => {
  it('needs a first-impression prediction, names part-to-part and additive mistakes, then completes once for XP', async () => {
    const ms = P().buildMission('mixture', 5);
    const { a, b, c, e } = ms.params;
    const app = await mount({ _ratioLab: { missionTab: 'mixture', missions: { mixture: { seed: 5 } } } }, { gradeLevel: '7th Grade' });
    expect($('[data-ratio-mission="mixture"]').getAttribute('data-mission-seed')).toBe('5');
    // The tape shows the cups of each mix, not the answer.
    expect($('[data-ratio-mix-tapes] desc').textContent).toContain(a + ' cups of');
    expect($('[data-ratio-mix-tapes] desc').textContent).not.toContain('of the whole');
    expect(await stepAnswer('mixture', 'fracA', a + '/' + (a + b))).toContain('Make your prediction');
    await pick('ratio-ms-predict-mixture', ms.predict.options.find((o) => o.id !== ms.predict.correct).id);
    expect(await stepAnswer('mixture', 'fracA', a + '/' + b)).toContain('You compared the two parts');
    // The prediction locks after the first check.
    expect($('input[name="ratio-ms-predict-mixture"]').disabled).toBe(true);
    expect(await stepAnswer('mixture', 'fracA', a + '/' + (a + b))).toContain('Correct!');
    expect(await stepAnswer('mixture', 'fracB', String(c / (c + e)))).toContain('Correct!');
    const compare = ms.steps[2].problem;
    const additive = Object.keys(compare.choiceTraps).find((k) => compare.choiceTraps[k].kind === 'additiveComparison');
    await pick('ratio-ms-mixture-compare-choice', additive);
    await click($('[data-ratio-mission-check="compare"]'));
    expect(fb('compare')).toContain('additive');
    expect(app.xp).toEqual([]);
    await pick('ratio-ms-mixture-compare-choice', P().normalizeChoice(compare.answers[0]));
    await click($('[data-ratio-mission-check="compare"]'));
    expect(fb('compare')).toContain('Correct!');
    // Stage D: the comparison came after a wrong pick (elimination), so the
    // mission is solved but does not count: no XP, no missionsDone tick.
    expect(fb('compare')).toContain('does not count');
    expect($('[data-ratio-mission-complete="mixture"]')).toBeNull();
    expect($('[data-ratio-mission-guessed="mixture"]')).toBeTruthy();
    expect($('[data-ratio-mix-tapes] desc').textContent).toContain('of the whole');
    expect($('[data-ratio-mission-predict-verdict="mixture"]').textContent).toContain('did not match');
    expect(app.xp).toEqual([]);
    expect(app.state().missionsDone).toBeUndefined();
    expect(app.state().missLog.map((m) => m.misconception)).toEqual(['partToPart', 'additiveComparison']);
    // A new mission has new numbers; solving it on the first try pays once.
    await click($('[data-ratio-new-mission="mixture"]'));
    const seed2 = Number($('[data-ratio-mission="mixture"]').getAttribute('data-mission-seed'));
    expect(seed2).not.toBe(5);
    expect($('[data-ratio-mission-complete="mixture"]')).toBeNull();
    const ms2 = P().buildMission('mixture', seed2);
    await pick('ratio-ms-predict-mixture', ms2.predict.correct);
    await stepAnswer('mixture', 'fracA', ms2.steps[0].problem.answerText);
    await stepAnswer('mixture', 'fracB', ms2.steps[1].problem.answerText);
    await pick('ratio-ms-mixture-compare-choice', P().normalizeChoice(ms2.steps[2].problem.answers[0]));
    await click($('[data-ratio-mission-check="compare"]'));
    expect($('[data-ratio-mission-complete="mixture"]')).toBeTruthy();
    expect(app.state().missionsDone['mixture:' + seed2]).toBe(true);
    expect(app.xp).toEqual([['ratioLab', 10, 'Ratio Lab mission complete']]);
    expect(app.state().missionXp.mixture).toBe(true);
    // A third mission finished cleanly pays nothing more.
    await click($('[data-ratio-new-mission="mixture"]'));
    const seed3 = Number($('[data-ratio-mission="mixture"]').getAttribute('data-mission-seed'));
    const ms3 = P().buildMission('mixture', seed3);
    await pick('ratio-ms-predict-mixture', ms3.predict.correct);
    await stepAnswer('mixture', 'fracA', ms3.steps[0].problem.answerText);
    await stepAnswer('mixture', 'fracB', ms3.steps[1].problem.answerText);
    await pick('ratio-ms-mixture-compare-choice', P().normalizeChoice(ms3.steps[2].problem.answers[0]));
    await click($('[data-ratio-mission-check="compare"]'));
    expect($('[data-ratio-mission-complete="mixture"]')).toBeTruthy();
    expect(app.xp.length).toBe(1);
    expect(app.errors).toEqual([]);
  });
});

describe('scale drawing mission (7.G.1)', () => {
  it('computes real length and area, names "area scales by k", redraws at the new scale, and hands off to the Unit Converter', async () => {
    window.StemLab.isRegistered = (id) => id === 'ratioLab' || id === 'unitConvert';
    const ms = P().buildMission('scale', 3);
    const app = await mount({ _ratioLab: { missionTab: 'scale', missions: { scale: { seed: 3 } } }, unitConvert: { badges: { first: true }, tab: 'quiz' } }, { gradeLevel: '7th Grade' });
    expect(await stepAnswer('scale', 'length', String(ms.l + ms.k1))).toContain('You added');
    expect(await stepAnswer('scale', 'length', String(ms.l * ms.k1))).toContain('Correct!');
    expect(await stepAnswer('scale', 'area', String(ms.l * ms.w * ms.k1))).toContain('Make your prediction');
    await pick('ratio-ms-predict-scale', 'k');
    const area = await stepAnswer('scale', 'area', String(ms.l * ms.w * ms.k1));
    expect(area).toContain('Area does not scale by k');
    expect(await stepAnswer('scale', 'area', String(ms.l * ms.w * ms.k1 * ms.k1))).toContain('Correct!');
    expect($('[data-ratio-mission-predict-verdict="scale"]').textContent).toContain('did not match');
    // The redraw appears as the student types it, before checking.
    expect($('[data-ratio-redraw]')).toBeNull();
    await type(document.getElementById('ratio-ms-scale-redrawL-input'), num(ms.L2));
    await type(document.getElementById('ratio-ms-scale-redrawW-input'), num(ms.W2));
    const rect = $('[data-ratio-redraw]');
    expect(rect.getAttribute('stroke-dasharray')).toBe('6 4');
    expect($('#ratio-plan-desc').textContent).toContain('Your new plan, at 1 cm to ' + ms.k2 + ' m, is ' + num(ms.L2) + ' cm long');
    await click($('[data-ratio-mission-check="redrawL"]'));
    await click($('[data-ratio-mission-check="redrawW"]'));
    expect($('[data-ratio-redraw]').getAttribute('stroke-dasharray')).toBeNull();
    expect($('[data-ratio-scale-summary]').textContent).toContain('area is');
    expect(app.xp).toEqual([['ratioLab', 10, 'Ratio Lab mission complete']]);
    // Hand the real length to the Unit Converter: only its conversion inputs change.
    await click($('[data-ratio-unit-link="mission-scale-3-length"]'));
    expect(app.tools).toEqual(['unitConvert']);
    expect(app.latest.unitConvert).toEqual({ badges: { first: true }, tab: 'convert', category: 'length', value: ms.l * ms.k1, valueDraft: String(ms.l * ms.k1), fromUnit: 'm', toUnit: 'ft' });
    expect(app.state().toolsLinked.unitConvert).toBe(true);
    expect(app.errors).toEqual([]);

    // The Unit Converter itself opens on that conversion.
    const handed = app.latest;
    await remount();
    const uc = loadTool('stem_lab/stem_tool_unitconvert.js', 'unitConvert');
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(() => uc.render(makeCtx({ toolData: handed, setToolData: () => {} })))); });
    const result = $('[aria-label^="Converted result:"]');
    expect(result).toBeTruthy();
    const feet = ms.l * ms.k1 / 0.3048;
    const shown = Number(result.getAttribute('aria-label').replace(/^Converted result: /, '').replace(/ ft$/, '').replace(/,/g, ''));
    expect(result.getAttribute('aria-label')).toMatch(/ ft$/);
    expect(Math.abs(shown - feet) / feet).toBeLessThan(0.01);
  });
});

describe('recipe mission: a ratio table with a fraction factor', () => {
  it('names the additive factor, fills the table, and accepts mixed numbers', async () => {
    const ms = P().buildMission('recipe', 11);
    await mount({ _ratioLab: { missionTab: 'recipe', missions: { recipe: { seed: 11 } } } }, { gradeLevel: '7th Grade' });
    expect($('[data-ratio-recipe-table]').textContent).toContain('Multiply by ?');
    await pick('ratio-ms-predict-recipe', ms.predict.correct);
    expect(await stepAnswer('recipe', 'factor', String(Math.abs(ms.T - ms.S)))).toContain('a difference');
    expect(await stepAnswer('recipe', 'factor', P().mixedText(ms.f))).toContain('Correct!');
    expect($('[data-ratio-recipe-table]').textContent).toContain('Multiply by ' + P().mixedText(ms.f));
    const flour = ms.items.find((i) => i.ing === 'flour');
    expect(await stepAnswer('recipe', 'flour', String(flour.q * ms.T))).toContain('not for 1');
    expect(await stepAnswer('recipe', 'flour', P().mixedText(flour.scaled))).toContain('Correct!');
    expect($('[data-ratio-recipe-row="flour"]').textContent).toContain(P().mixedText(flour.scaled) + ' cups');
    expect($('[data-ratio-mission-predict-verdict="recipe"]').textContent).toContain('Your prediction was right');
  });
});

describe('proportional detective mission (7.RP.2)', () => {
  it('needs the right verdict and the deciding evidence, names linear-but-not-through-(0,0), and shows the teacher', async () => {
    const ms = P().buildMission('detective', 9);
    const line = ms.cases.find((c) => c.type === 'graphIntercept');
    const table = ms.cases.find((c) => c.type === 'tableLinear');
    const app = await mount({ _ratioLab: { missionTab: 'detective', missions: { detective: { seed: 9 } } } }, { gradeLevel: '7th Grade', isTeacherMode: true });
    // 2026-11-04: one case at a time; the seven cases are dots in a tab list.
    expect(document.querySelectorAll('[data-ratio-mission-step]').length).toBe(1);
    expect(document.querySelectorAll('[data-ratio-case-dot]').length).toBe(7);
    await click($('[data-ratio-case-dot="' + line.id + '"]'));
    const base = 'ratio-ms-detective-' + line.id;
    await pick(base + '-v', 'yes'); await pick(base + '-e', 'lineMisses');
    await click($('[data-ratio-mission-check="' + line.id + '"]'));
    expect(fb(line.id)).toContain('has to pass through (0, 0)');
    await pick(base + '-v', 'no'); await pick(base + '-e', 'sameStep');
    await click($('[data-ratio-mission-check="' + line.id + '"]'));
    expect(fb(line.id)).toContain('does not settle it');
    await pick(base + '-e', 'lineMisses');
    await click($('[data-ratio-mission-check="' + line.id + '"]'));
    expect(fb(line.id)).toContain('Correct!');
    expect($('[data-ratio-detective-note="' + line.id + '"]').textContent).toContain('Linear is not enough');
    // The graph case has a text equivalent (checked while its case is open).
    expect($('#' + base + '-graph-desc').textContent).toContain('(0, ' + line.graph.points[0][1] + ')');
    await click($('[data-ratio-case-dot="' + table.id + '"]'));
    const tb = 'ratio-ms-detective-' + table.id;
    await pick(tb + '-v', 'yes'); await pick(tb + '-e', 'sameStep');
    await click($('[data-ratio-mission-check="' + table.id + '"]'));
    expect(fb(table.id)).toContain('A constant change is not a constant ratio');
    expect($('[data-ratio-detective-table="' + table.id + '"]').querySelectorAll('tbody tr').length).toBe(3);
    // Two wrong tries open the worked solution, which then earns nothing.
    expect($('[data-ratio-mission-reveal="' + table.id + '"]')).toBeNull();
    await pick(tb + '-v', 'yes');
    await click($('[data-ratio-mission-check="' + table.id + '"]'));
    await click($('[data-ratio-mission-reveal="' + table.id + '"]'));
    expect($('[data-ratio-mission-solution="' + table.id + '"]').textContent).toContain('y ÷ x is not the same in every row');
    await pick(tb + '-v', 'no'); await pick(tb + '-e', 'ratioChanges');
    await click($('[data-ratio-mission-check="' + table.id + '"]'));
    expect(fb(table.id)).toContain('does not count');
    expect($('[data-ratio-mission-step="' + table.id + '"]').getAttribute('data-solved')).toBe('false');
    const summary = $('[data-ratio-teacher-table]').textContent;
    expect(summary).toContain('Proportional relationship detective');
    expect(summary).toContain('Called a line that misses (0, 0) proportional');
    expect(summary).toContain('Took a constant change as proof of proportionality');
    expect(app.errors).toEqual([]);
  });
});

describe('AI hint through ctx.getHint', () => {
  it('appears only after two tries, passes the host contract, and shows the reply', async () => {
    const calls = [];
    const getHint = (...args) => { calls.push(args); args[5]('Think about what 5 was multiplied by. (AI hint)'); };
    await mount({ _ratioLab: { mode: 'ratioTable', sourceByMode: { ratioTable: 'fixed' } } }, { getHint, aiHintsEnabled: true });
    const ans = document.getElementById('ratio-challenge-answer');
    await type(ans, '7'); await click(byText('Check answer'));
    expect($('[data-ratio-ai-ask]')).toBeNull();
    await type(ans, '8'); await click(byText('Check answer'));
    await click($('[data-ratio-ai-ask="ratio-paint"]'));
    expect(calls.length).toBe(1);
    expect(calls[0].slice(0, 5)).toEqual(['ratioLab', 'A paint mix uses 3 cups blue for every 5 cups white. If there are 20 cups of white, how many cups of blue are needed?', '8', '12', 2]);
    expect($('[data-ratio-ai-hint="ratio-paint"]').textContent).toBe('Think about what 5 was multiplied by. (AI hint)');
  });

  it('is absent when hints are off, waits quietly when the host never answers, and survives a throwing host', async () => {
    const wrongTwice = async () => { const ans = document.getElementById('ratio-challenge-answer'); await type(ans, '7'); await click(byText('Check answer')); await type(ans, '8'); await click(byText('Check answer')); };
    await mount({ _ratioLab: { mode: 'ratioTable', sourceByMode: { ratioTable: 'fixed' } } }, { getHint: () => { throw new Error('no'); }, aiHintsEnabled: false });
    await wrongTwice();
    expect($('[data-ratio-ai-ask]')).toBeNull();
    await remount();
    let app = await mount({ _ratioLab: { mode: 'ratioTable', sourceByMode: { ratioTable: 'fixed' } } }, { getHint: () => {} });
    await wrongTwice();
    await click($('[data-ratio-ai-ask]'));
    expect($('[data-ratio-ai-hint-state="waiting"]')).toBeTruthy();
    expect(app.errors).toEqual([]);
    await remount();
    app = await mount({ _ratioLab: { mode: 'ratioTable', sourceByMode: { ratioTable: 'fixed' } } }, { getHint: () => { throw new Error('offline'); } });
    await wrongTwice();
    await click($('[data-ratio-ai-ask]'));
    expect($('[data-ratio-ai-hint-state="failed"]').textContent).toContain('not available');
    expect(app.errors).toEqual([]);
    // The offline path still works: hint 2 and the worked solution.
    await click(byText('Show hint 1')); await click(byText('Show hint 2'));
    expect(document.getElementById('ratio-challenge-hints').textContent).toContain('Five was multiplied by 4');
  });

  it('works on mission steps too', async () => {
    const calls = [];
    const ms = P().buildMission('recipe', 11);
    await mount({ _ratioLab: { missionTab: 'recipe', missions: { recipe: { seed: 11, predict: 'more' } } } }, { getHint: (...a) => { calls.push(a); a[5]('Divide new by old.'); } });
    await stepAnswer('recipe', 'factor', '99');
    await stepAnswer('recipe', 'factor', '98');
    await click($('[data-ratio-ai-ask="mission-recipe-11-factor"]'));
    expect(calls[0][3]).toBe(P().mixedText(ms.f));
    expect($('[data-ratio-ai-hint="mission-recipe-11-factor"]').textContent).toBe('Divide new by old.');
  });
});

describe('practice and lesson handoffs', () => {
  it('grade 7 double-line practice includes scale drawings with the k² misconception named', async () => {
    let seed = 1;
    while (seed < 2000 && P().generateProblem('numberLine', 'g7', seed).kind !== 'scaleArea') seed++;
    expect(P().generateProblem('numberLine', 'g7', seed).kind).toBe('scaleArea');
    const app = await mount({ _ratioLab: { mode: 'numberLine', sourceByMode: { numberLine: 'practice' }, practiceSeedByMode: { 'numberLine:g7': seed } } }, { gradeLevel: '7th Grade' });
    const pr = P().generateProblem('numberLine', 'g7', seed);
    await click($('input[name="ratio-problem-predict"]'));
    await type(document.getElementById('ratio-challenge-answer'), String(pr.params.w * pr.params.l * pr.params.k));
    await click(byText('Check answer'));
    expect(document.getElementById('ratio-challenge-feedback').textContent).toContain('Area does not scale by k');
    expect(app.state().missLog[0].misconception).toBe('areaScaleK');
  });

  it('the lesson car problem sends 60 mph to the Unit Converter after it is solved', async () => {
    window.StemLab.isRegistered = (id) => id === 'ratioLab' || id === 'unitConvert';
    const app = await mount({ _ratioLab: { mode: 'unitRates', challengeCursorByMode: { unitRates: 'unit-speed' } } });
    expect($('[data-ratio-unit-link]')).toBeNull();
    await type(document.getElementById('ratio-challenge-answer'), '60');
    await click(byText('Check answer'));
    await click($('[data-ratio-unit-link="unit-speed"]'));
    expect(app.latest.unitConvert).toEqual({ category: 'speed', value: 60, valueDraft: '60', fromUnit: 'mph', toUnit: 'km/h', tab: 'convert' });
  });
});

describe('mission tabs and teacher lock', () => {
  it('uses one tab stop with arrow keys, and a teacher can lock a mission', async () => {
    // 2026-11-04: missions sit behind their tab, and Mixtures is a grade 6 mission.
    const app = await mount({ _ratioLab: { labView: 'missions' } }, { gradeLevel: '6th Grade' });
    const tabs = [...document.querySelectorAll('[role="tablist"] [id^="ratio-mission-tab-"]')];
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
    // Stage C: the tabs follow the band's order (grade 6: mixture, recipe, scale, detective).
    expect(tabs.map((tab) => tab.id.replace('ratio-mission-tab-', ''))).toEqual(['mixture', 'recipe', 'scale', 'detective']);
    tabs[0].focus();
    await key(tabs[0], 'ArrowRight');
    expect(app.state().missionTab).toBe('recipe');
    expect(document.activeElement.id).toBe('ratio-mission-tab-recipe');
    await key(document.activeElement, 'End');
    expect(app.state().missionTab).toBe('detective');
    expect($('#ratio-mission-panel').getAttribute('aria-labelledby')).toBe('ratio-mission-tab-detective');
    await remount();
    const locked = await mount({ _ratioLab: { labView: 'missions', teacher: { lockMission: 'recipe' } } });
    expect($('[id^="ratio-mission-tab-"][aria-selected="true"]').id).toBe('ratio-mission-tab-recipe');
    await click(document.getElementById('ratio-mission-tab-scale'));
    expect($('[id^="ratio-mission-tab-"][aria-selected="true"]').id).toBe('ratio-mission-tab-recipe');
    expect(document.getElementById('ratio-mission-tab-scale').getAttribute('aria-disabled')).toBe('true');
    expect(locked.errors).toEqual([]);
  });
});

describe('robustness', () => {
  it('mounts every mission in every theme, and survives hostile saved mission state', async () => {
    const states = [];
    for (const missionTab of ['scale', 'mixture', 'recipe', 'detective']) {
      states.push([{ missionTab }, {}], [{ missionTab }, { isDark: true }], [{ missionTab }, { isContrast: true, isTeacherMode: true }]);
    }
    states.push([{ missionTab: 'zzz', missions: 'x', missionsDone: 3, missionXp: [], aiHints: [], aiHintAsked: 'y' }, {}]);
    states.push([{ missionTab: 'scale', missions: { scale: { seed: -5, ans: 7, solved: 'y', tries: null, fb: [], revealed: 4 } } }, {}]);
    states.push([{ missionTab: 'detective', missions: { detective: { seed: 'nope', ans: { 'case1:v': 'maybe', 'case1:e': 'zzz' } } }, teacher: { lockMission: 'bogus' } }, {}]);
    for (const [state, ctx] of states) {
      const app = await mount({ _ratioLab: state }, ctx);
      const panel = $('#ratio-mission-panel');
      expect(panel, JSON.stringify(state)).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/NaN|undefined|\{\w+\}|Ã|â€/);
      for (const svg of panel.querySelectorAll('svg')) {
        const ids = (svg.getAttribute('aria-labelledby') || '').split(' ').filter(Boolean);
        expect(ids.length > 0 && ids.every((id) => document.getElementById(id)), JSON.stringify(state)).toBe(true);
      }
      for (const btn of panel.querySelectorAll('button')) expect(btn.textContent.trim().length, btn.outerHTML.slice(0, 80)).toBeGreaterThan(0);
      for (const input of panel.querySelectorAll('input[type="text"]')) expect((input.getAttribute('aria-labelledby') || '').split(' ').every((id) => document.getElementById(id))).toBe(true);
      expect(app.errors, JSON.stringify(state)).toEqual([]);
      await remount();
    }
  }, 20000);
});
