import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BENCHES = [
  { id: 'lever', load: 'leverLoad', geometry: { leverEffortArm: 2, leverLoadArm: 1 }, loadValue: 400, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', geometry: { pulleySegments: 2 }, loadValue: 400, ma: d => d.pulleySegments },
  { id: 'windlass', load: 'windlassLoad', geometry: { windlassHandleR: 0.45, windlassDrumR: 0.1 }, loadValue: 400, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', load: 'rampLoad', geometry: { rampLength: 4, rampHeight: 1 }, loadValue: 400, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', geometry: { wedgeLength: 0.3, wedgeThickness: 0.06 }, loadValue: 800, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', load: 'screwLoad', geometry: { screwHandleR: 0.15, screwPitch: 0.005 }, loadValue: 2000, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => ({ ...b.geometry, [b.load]: b.loadValue })));
const KINDS = ['budgetTime', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'];
const UNITS = { budgetTime: 's', budgetLoad: 'N', budgetMovement: 'm', requiredEfficiency: '%' };
const PAIRS = BENCHES.flatMap(first => BENCHES.filter(second => second !== first).map(second => ({ first, second, name: `${first.id}/${second.id}` })));
const CHALLENGES = BENCHES.flatMap(b => KINDS.map(kind => ({ b, kind, name: `${b.id}/${kind}` })));
const defaultSecond = b => BENCHES.find(x => x.id === (b.id === 'pulley' ? 'lever' : 'pulley'));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
// Independent equations and fixtures; no production helper supplies expectations.
function independent(load, distance, firstMA, secondMA, firstPercent = 80, secondPercent = 90, seconds = 5, budget = 100) {
  const firstEta = firstPercent / 100, secondEta = secondPercent / 100, idealMA = firstMA * secondMA, workOut = load * distance;
  const transferWork = workOut / secondEta, inputWork = transferWork / firstEta;
  const firstLoss = Math.max(0, inputWork - transferWork), secondLoss = Math.max(0, transferWork - workOut);
  return { idealMA, efficiency: firstPercent * secondPercent / 100, actualMA: idealMA * firstEta * secondEta,
    inputForce: load / (idealMA * firstEta * secondEta), inputTravel: distance * idealMA,
    transferForce: load / (secondMA * secondEta), transferTravel: distance * secondMA,
    workOut, transferWork, inputWork, firstLoss, secondLoss, totalLoss: firstLoss + secondLoss, seconds,
    inputPower: inputWork / seconds, transferPower: transferWork / seconds, usefulPower: workOut / seconds, firstLossPower: firstLoss / seconds, secondLossPower: secondLoss / seconds, budget, budgetTime: inputWork / budget, budgetLoad: budget * seconds * firstEta * secondEta / distance, budgetMovement: budget * seconds * firstEta * secondEta / load, requiredEfficiency: workOut / (budget * seconds) * 100, powerFits: inputWork / seconds <= budget + 1e-9 * budget, idealFits: workOut / seconds <= budget + 1e-9 * budget };
}
function expected(s) {
  const d = s.state(), b = BENCHES.find(x => x.id === d.bench), draft = d.benchCompound?.[b.id] || {}, second = BENCHES.find(x => x.id === (draft.second || defaultSecond(b).id));
  const output = draft.geometry ? Object.fromEntries(Object.entries(draft.geometry).map(([k, v]) => [k, Number(v)])) : second.geometry;
  return independent(d[b.load], d.loadDistance, b.ma(d), second.ma(output), Number(draft.percentIn ?? 80), Number(draft.percentOut ?? 90), Number(draft.duration ?? 5) * (draft.timeUnit === 'min' ? 60 : 1), Number(draft.budget ?? 100));
}
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let cachedState, cachedTree;
  const render = () => { if (cachedState !== store.toolData.machineLab) { cachedState = store.toolData.machineLab; cachedTree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return cachedTree; };
  const find = predicate => nodes(render()).find(predicate), state = () => store.toolData.machineLab;
  const byId = suffix => find(n => n.props?.id === `ml-compound-${suffix}-${state().bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-compound-${kind}`] !== undefined);
  const invoke = n => { expect(n).toBeTruthy(); n.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { render, find, store, state, awardXP, tryAward, byId, action, invoke, refresh: () => { cachedState = undefined; },
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...state(), ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-compound'] === state().bench),
    metric: key => find(n => n.props?.['data-ml-compound-budget-metric'] === key),
    energy: key => find(n => n.props?.['data-ml-compound-metric'] === key),
    result: () => find(n => n.props?.['data-ml-compound-result'] !== undefined)?.props['data-ml-compound-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, suffix).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    row: (kind = 'budgetTime', id = b.id) => find(n => n.props?.['data-ml-compound-record-station'] === id && n.props?.['data-ml-compound-record-skill'] === kind),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, kind = 'budgetTime', value) { s.edit('question', kind); s.edit('answer', value ?? expected(s)[kind]); s.edit('unit', UNITS[kind]); s.click('check'); }
function record(extra = {}) {
  return { version: 3, benchId: 'lever', second: 'pulley', inputSettings: { ...BENCHES[0].geometry }, outputSettings: { ...BENCHES[1].geometry }, load: 400, loadDistance: 0.5,
    percentIn: 80, percentOut: 90, seconds: 5, budget: 100, question: 'budgetTime', answer: String(independent(400, 0.5, 2, 2).budgetTime), unit: 's', hint: 0, completion: 'checked', explanation: '', ...extra };
}
function legacy(extra = {}) { const r = record({ version: 1, question: 'idealMA', answer: '4', unit: 'ratio', ...extra }); delete r.seconds; delete r.budget; return r; }


function powerRecord(extra = {}) { const r = record({ version: 2, question: 'usefulPower', answer: '40', unit: 'W', ...extra }); delete r.budget; return r; }

describe('Machine Lab: compound planning physics', () => {
  it.each(PAIRS)('solves four inverse questions independently for $name', ({ first, second }) => {
    for (const [p1, p2, seconds, budget] of [[80, 90, 5, 100], [100, 100, 0.01, 0.01], [1, 1, 3600, 100000], [37.5, 99.999999, 120, 40]]) {
      const args = [first.loadValue, 0.5, first.ma(BASE), second.ma(BASE), p1, p2, seconds, budget], actual = tool._math.compoundBudget(...args), want = independent(...args);
      expect(actual).toBeTruthy(); for (const [key, value] of Object.entries(want)) typeof value === 'boolean' ? expect(actual[key], key).toBe(value) : expect(actual[key], key).toBeCloseTo(value, 7);
      expect(actual.budgetTime * budget).toBeCloseTo(actual.inputWork, 8);
      expect(actual.budgetLoad * 0.5).toBeCloseTo(budget * seconds * p1 / 100 * p2 / 100, 7);
      expect(actual.budgetMovement * first.loadValue).toBeCloseTo(budget * seconds * p1 / 100 * p2 / 100, 7);
      expect(actual.requiredEfficiency * budget * seconds / 100).toBeCloseTo(first.loadValue * 0.5, 7);
    }
  });
  it.each(['load', 'distance', 'input MA', 'output MA', 'input efficiency', 'output efficiency', 'seconds', 'budget'].map((name, index) => ({ name, index })))('rejects nonnumeric or nonpositive $name', ({ index }) => {
    for (const value of [null, undefined, '', '100', true, {}, NaN, Infinity, -Infinity, 0, -1]) { const args = [400, 0.5, 2, 2, 80, 90, 5, 100]; args[index] = value; expect(tool._math.compoundBudget(...args)).toBeNull(); }
  });
  it('accepts both budget boundaries and rejects values outside them', () => {
    for (const budget of [0.01, 100000]) expect(tool._math.compoundBudget(400, 0.5, 2, 2, 80, 90, 5, budget)).toBeTruthy();
    for (const budget of [0.009999, 100000.000001]) expect(tool._math.compoundBudget(400, 0.5, 2, 2, 80, 90, 5, budget)).toBeNull();
  });
  it('preserves work and power fields exactly while adding inverse calculations', () => {
    const args = [600, 0.5, 2, 3, 80, 50, 10], power = tool._math.compoundPower(...args), planning = tool._math.compoundBudget(...args, 75);
    for (const [key, value] of Object.entries(power)) expect(planning[key], key).toBe(value);
    expect(planning).toMatchObject({ budgetTime: 10, budgetLoad: 600, budgetMovement: 0.5, requiredEfficiency: 40, powerFits: true, idealFits: true });
  });
  it('distinguishes current-efficiency, ideal-only and physically impossible tasks', () => {
    const at = budget => tool._math.compoundBudget(600, 0.5, 2, 3, 80, 50, 10, budget);
    expect(at(75)).toMatchObject({ powerFits: true, idealFits: true }); expect(at(50)).toMatchObject({ powerFits: false, idealFits: true, requiredEfficiency: 60 });
    expect(at(30)).toMatchObject({ powerFits: false, idealFits: true, requiredEfficiency: 100 }); expect(at(20)).toMatchObject({ powerFits: false, idealFits: false, requiredEfficiency: 150 });
  });
  it('allows only floating-point-scale slack at each feasibility boundary', () => {
    const at = budget => tool._math.compoundBudget(600, 0.5, 2, 3, 80, 50, 10, budget);
    expect(at(75 - 1e-8).powerFits).toBe(true); expect(at(75 - 1e-5).powerFits).toBe(false);
    expect(at(30 - 1e-9).idealFits).toBe(true); expect(at(30 - 1e-5).idealFits).toBe(false);
  });
  it('uses the same relative budget tolerance for both fit statuses at the minimum budget', () => {
    const tooQuick = tool._math.compoundBudget(10, 0.1, 2, 2, 100, 100, 99.999999, 0.01), exact = tool._math.compoundBudget(10, 0.1, 2, 2, 100, 100, 100, 0.01);
    expect(tooQuick).toMatchObject({ powerFits: false, idealFits: false }); expect(exact).toMatchObject({ powerFits: true, idealFits: true, requiredEfficiency: 100 });
  });
  it('holds required efficiency independent of the currently assumed stage efficiencies', () => {
    const a = tool._math.compoundBudget(400, 0.5, 2, 2, 100, 100, 5, 100), b = tool._math.compoundBudget(400, 0.5, 2, 2, 10, 20, 5, 100);
    expect(a.requiredEfficiency).toBe(40); expect(b.requiredEfficiency).toBe(40); expect(b.budgetTime).toBeGreaterThan(a.budgetTime); expect(b.budgetLoad).toBeLessThan(a.budgetLoad);
  });
  it('leaves inverse results outside workshop control ranges unclamped', () => {
    const slow = tool._math.compoundBudget(2000, 10, 2, 2, 1, 1, 0.01, 0.01), large = tool._math.compoundBudget(1, 0.001, 2, 2, 100, 100, 3600, 100000);
    expect(slow.budgetTime).toBe(20000000000); expect(slow.requiredEfficiency).toBe(20000000000); expect(slow.idealFits).toBe(false);
    expect(large.budgetLoad).toBe(360000000000); expect(large.budgetMovement).toBe(360000000);
  });
  it('rejects derived overflow instead of returning partial nonfinite planning', () => {
    expect(tool._math.compoundBudget(Number.MAX_VALUE / 2, 1, 1, 1, 100, 100, 3600, 0.01)).toBeNull();
    expect(tool._math.compoundBudget(1, Number.MIN_VALUE, 1, 1, 100, 100, 3600, 100000)).toBeNull();
  });
  it('doubles alternative capacity with time and halves the required efficiency while preserving minimum time', () => {
    const a = tool._math.compoundBudget(400, 0.5, 2, 2, 80, 90, 5, 100), b = tool._math.compoundBudget(400, 0.5, 2, 2, 80, 90, 10, 100);
    expect(b.budgetLoad).toBe(a.budgetLoad * 2); expect(b.budgetMovement).toBe(a.budgetMovement * 2); expect(b.requiredEfficiency).toBe(a.requiredEfficiency / 2); expect(b.budgetTime).toBe(a.budgetTime);
  });
  it('leaves capacity fixed when geometry trades force for travel', () => {
    const a = tool._math.compoundBudget(400, 0.5, 2, 2, 80, 90, 5, 100), b = tool._math.compoundBudget(400, 0.5, 20, 50, 80, 90, 5, 100);
    for (const key of KINDS) expect(b[key]).toBe(a[key]); expect(b.inputForce).toBeLessThan(a.inputForce); expect(b.inputTravel).toBeGreaterThan(a.inputTravel);
  });
});

describe('Machine Lab: compound planning comparison', () => {
  it.each(BENCHES)('renders four independent $id planning values without mutating the draft', b => {
    const s = session(b), initial = s.state(), want = expected(s); expect(s.byId('budget').props.value).toBe('100');
    for (const kind of KINDS) { expect(Number(s.metric(kind).props['data-value']), kind).toBeCloseTo(want[kind], 10); expect(text(s.metric(kind))).toContain(UNITS[kind]); }
    expect(s.state()).toBe(initial); expect(s.state().benchCompound).toBeUndefined(); expect(nodes(s.panel()).filter(n => n.props?.['data-ml-compound-metric'] !== undefined)).toHaveLength(13);
    expect(nodes(s.panel()).filter(n => n.props?.['data-ml-compound-power-metric'] !== undefined)).toHaveLength(5);
  });
  it.each(['k2', 'g35', 'g68', 'g912'])('retains the existing grade gate for %s', bandOverride => { const s = session(BENCHES[0], { bandOverride }); expect(!!s.metric('budgetTime')).toBe(['g68', 'g912'].includes(bandOverride)); });
  it.each(['', ' ', '0', '-1', '0.009', '100000.1', 'Infinity', 'NaN', '1e2', '100 W'])('keeps all original fourteen skills available when budget %j is invalid', value => {
    const s = session(); s.edit('budget', value); expect(s.byId('budget').props['aria-invalid']).toBe(true); expect(s.metric('budgetTime')).toBeUndefined();
    expect(s.energy('inputWork')).toBeTruthy(); expect(s.find(n => n.props?.['data-ml-compound-power-metric'] === 'inputPower')).toBeTruthy();
    s.edit('answer', '4'); s.edit('unit', 'ratio'); s.click('check'); expect(s.result()).toBe('correct'); s.click('save'); expect(s.state().benchCompoundRecords.lever.idealMA.version).toBe(1);
    s.edit('question', 'usefulPower'); s.edit('answer', '40'); s.edit('unit', 'W'); s.click('check'); expect(s.result()).toBe('correct'); s.click('save'); expect(s.state().benchCompoundRecords.lever.usefulPower.version).toBe(2);
    expect(nodes(s.byId('question')).filter(n => n.type === 'option')).toHaveLength(18);
  });
  it.each(KINDS)('guards disabled %s actions for invalid budget and recovers after correction', kind => {
    const s = session(); s.edit('budget', ''); s.edit('question', kind); const before = s.state();
    for (const action of ['check', 'hint', 'reveal', 'save']) { expect(s.action(action).props.disabled).toBe(true); s.invoke(s.action(action)); }
    s.byId('answer').props.onKeyDown({ key: 'Enter', preventDefault: vi.fn() }); expect(s.state()).toBe(before); expect(s.result()).toBeUndefined(); expect(text(s.panel())).not.toMatch(/NaN|Infinity|undefined/);
    s.edit('budget', '100'); answer(s, kind); expect(s.result()).toBe('correct');
  });
  it('requires valid time for planning but keeps original energy practice usable', () => {
    const s = session(); s.edit('duration', ''); s.edit('question', 'budgetTime'); expect(s.metric('budgetTime')).toBeUndefined(); expect(s.action('check').props.disabled).toBe(true);
    s.edit('question', 'idealMA'); s.edit('answer', '4'); s.edit('unit', 'ratio'); s.click('check'); expect(s.result()).toBe('correct');
  });
  it('converts minutes before computing all four alternatives', () => {
    const s = session(); s.edit('duration', '2'); s.edit('timeUnit', 'min'); for (const kind of KINDS) expect(Number(s.metric(kind).props['data-value'])).toBeCloseTo(expected(s)[kind], 8);
    answer(s, 'budgetLoad'); s.click('save'); expect(s.state().benchCompoundRecords.lever.budgetLoad.seconds).toBe(120);
  });
  it('associates the input budget with its label and meaningful guidance', () => {
    const s = session(), input = s.byId('budget'); expect(nodes(s.panel()).some(n => n.type === 'label' && n.props.htmlFor === input.props.id)).toBe(true);
    const description = input.props['aria-describedby']; expect(typeof description).toBe('string'); expect(description.length).toBeGreaterThan(0);
    for (const id of description.split(' ')) expect(s.find(n => n.props?.id === id)).toBeTruthy();
  });
  it('keeps output-ramp movement defined as vertical rise', () => {
    const s = session(); s.edit('second', 'ramp'); expect(Number(s.metric('budgetMovement').props['data-value'])).toBeCloseTo(0.9, 10); expect(text(s.panel())).toMatch(/vertical rise/i);
  });
  it('exposes current and ideal feasibility independently as task limits change', () => {
    const s = session();
    const flags = () => ['data-ml-compound-budget-fit', 'data-ml-compound-budget-ideal-fit'].map(key => String(s.find(n => n.props?.[key] !== undefined).props[key]));
    expect(flags()).toEqual(['true', 'true']); s.edit('budget', '50'); expect(flags()).toEqual(['false', 'true']); s.edit('budget', '30'); expect(flags()).toEqual(['false', 'false']);
    expect(Number(s.metric('requiredEfficiency').props['data-value'])).toBeGreaterThan(100);
  });
});

describe('Machine Lab: compound planning skills', () => {
  it.each(CHALLENGES)('grades an independently rounded $name answer without awarding progress', ({ b, kind }) => {
    const s = session(b); answer(s, kind, Number(expected(s)[kind].toPrecision(3))); expect(s.result()).toBe('correct'); expect(s.action('save').props.disabled).toBe(false);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(KINDS)('requires the specific unit for %s', kind => {
    const s = session(); answer(s, kind);
    for (const unit of ['', 'J', 'W', ...Object.values(UNITS)].filter(unit => unit !== UNITS[kind])) { s.edit('unit', unit); s.click('check'); expect(s.result()).toBe('unit'); expect(s.action('save').props.disabled).toBe(true); }
  });
  it.each(['', ' ', '-1', 'Infinity', 'NaN', '3 s', '3e0'])('rejects invalid answer %j before checking its unit', value => {
    const s = session(); s.edit('question', 'budgetTime'); s.edit('answer', value); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.action('save').props.disabled).toBe(true);
  });
  it.each(KINDS)('provides two progressive %s hints before deliberate reveal', kind => {
    const s = session(); s.edit('question', kind);
    for (const level of [1, 2]) { s.click('hint'); expect(s.find(n => n.props?.['data-ml-compound-hint-level'] !== undefined).props['data-ml-compound-hint-level']).toBe(level); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true); }
    expect(s.action('hint').props.disabled).toBe(true); s.click('reveal'); expect(s.result()).toBe('solution'); s.click('save'); expect(s.state().benchCompoundRecords.lever[kind]).toMatchObject({ version: 3, hint: 2, completion: 'solution' });
  });
  it('accepts a calculated efficiency above 100 without treating it as feasible', () => {
    const s = session(); s.edit('budget', '20'); answer(s, 'requiredEfficiency', '200'); expect(s.result()).toBe('correct'); s.click('save'); expect(s.state().benchCompoundRecords.lever.requiredEfficiency.answer).toBe('200');
    expect(text(s.panel())).toMatch(/impossible|cannot|even.*ideal/i);
  });
  it('teaches required efficiency from available energy rather than current loss assumptions', () => {
    const s = session(); answer(s, 'requiredEfficiency', '72'); expect(s.result()).toBe('incorrect');
    const feedback = text(s.find(n => n.props?.['data-ml-compound-result'] !== undefined)); expect(feedback).toContain('Divide useful work by budget × seconds'); expect(feedback).toContain('multiply by 100'); expect(feedback).toContain('do not use the currently assumed stage efficiencies');
    s.edit('percentIn', '10'); s.edit('percentOut', '20'); expect(Number(s.metric('requiredEfficiency').props['data-value'])).toBe(40); answer(s, 'requiredEfficiency', '40'); expect(s.result()).toBe('correct');
  });
  it('keeps calculated seconds unclamped and applies the one-percent grading boundary', () => {
    const s = session(); s.edit('budget', '.01'); answer(s, 'budgetTime', expected(s).budgetTime * 0.99); expect(s.result()).toBe('correct');
    s.edit('answer', expected(s).budgetTime * 1.010001); s.click('check'); expect(s.result()).toBe('incorrect'); expect(expected(s).budgetTime).toBeGreaterThan(3600);
  });
  it('checks on Enter and preserves solution provenance after a later correct answer', () => {
    const s = session(); s.edit('question', 'budgetLoad'); s.edit('answer', '720'); s.edit('unit', 'N'); const preventDefault = vi.fn(); s.byId('answer').props.onKeyDown({ key: 'Enter', preventDefault }); expect(preventDefault).toHaveBeenCalledOnce(); expect(s.result()).toBe('correct');
    s.click('reveal'); s.edit('answer', '720'); s.click('check'); expect(s.result()).toBe('solution'); s.click('save'); expect(s.state().benchCompoundRecords.lever.budgetLoad.completion).toBe('solution');
  });
  it('offers seconds only for planning questions and keeps legacy unit choices intact', () => {
    const s = session(), choices = () => nodes(s.byId('unit')).filter(n => n.type === 'option').map(n => n.props.value);
    const before = choices(); expect(before).not.toContain('s'); s.edit('question', 'usefulPower'); expect(choices()).toEqual(before);
    for (const kind of KINDS) { s.edit('question', kind); expect(choices()).toContain('s'); }
    s.edit('question', 'idealMA'); expect(choices()).toEqual(before);
  });
});

describe('Machine Lab: compound planning identity', () => {
  it.each([['budget', '50'], ['duration', '10'], ['timeUnit', 'min']])('resets all attempt evidence when %s changes', (key, value) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); s.edit('explanation', 'Earlier plan'); s.edit(key, value);
    for (const field of ['answer', 'unit', 'explanation']) expect(s.byId(field).props.value).toBe(''); expect(s.result()).toBeUndefined();
    expect(s.state().benchCompound.lever).toMatchObject({ hint: 0, checked: false, revealed: false });
  });
  it.each([['budget', '50'], ['duration', '10'], ['timeUnit', 'min']])('rejects delayed callbacks after a %s change', (key, value) => {
    const s = session(); answer(s); const callbacks = ['check', 'hint', 'reveal', 'save', 'next'].map(s.action), inputs = ['answer', 'budget', 'duration', 'timeUnit', 'explanation'].map(s.byId); s.edit(key, value); const before = s.state();
    callbacks.forEach(s.invoke); inputs.forEach(n => n.props.onChange({ target: { value: '999' } })); expect(s.state()).toBe(before);
  });
  it('rechecks the latest answer before accepting an old save callback', () => {
    const s = session(); answer(s); const oldSave = s.action('save'); s.edit('answer', '1'); s.invoke(oldSave); expect(s.state().benchCompoundRecords).toBeUndefined();
  });
  it('keeps station budgets separate and independent from other simulation drafts', () => {
    const retained = { benchPower: { lever: { duration: '20' } }, benchEfficiency: { lever: { percent: '50' } }, shopDemoDuration: 2200, shopSlowMotion: true }, s = session(BENCHES[0], retained), before = s.state();
    s.edit('budget', '75'); answer(s); const first = s.state().benchCompound.lever; s.patch({ bench: 'pulley' }); expect(s.byId('budget').props.value).toBe('100'); s.edit('budget', '25'); expect(s.state().benchCompound.lever).toBe(first);
    s.patch({ bench: 'lever' }); expect(s.byId('budget').props.value).toBe('75'); expect(s.result()).toBe('correct'); for (const key of Object.keys(retained)) expect(s.state()[key]).toBe(before[key]);
  });
});

describe('Machine Lab: compound planning records', () => {
  it.each(BENCHES)('saves exact fixed v3 $id snapshots without altering earlier evidence', b => {
    const old = legacy(), power = powerRecord(), preserved = { benchPowerRecords: { other: { keep: true } }, benchEfficiencyRecords: { other: { keep: true } }, provenBenches: { other: true } }, s = session(b, { ...preserved, benchCompoundRecords: { lever: { idealMA: old, usefulPower: power } } }), initial = s.state();
    s.edit('duration', '2'); s.edit('timeUnit', 'min'); s.edit('budget', '75'); answer(s); s.click('hint'); s.edit('explanation', 'Hold final load and movement fixed, then divide input work by the available power.'); s.click('save');
    expect(s.state().benchCompoundRecords[b.id].budgetTime).toEqual({ version: 3, benchId: b.id, second: defaultSecond(b).id, inputSettings: { ...b.geometry }, outputSettings: { ...defaultSecond(b).geometry }, load: b.loadValue, loadDistance: 0.5,
      percentIn: 80, percentOut: 90, seconds: 120, budget: 75, question: 'budgetTime', answer: String(expected(s).budgetTime), unit: 's', hint: 1, completion: 'checked', explanation: 'Hold final load and movement fixed, then divide input work by the available power.' });
    expect(s.state().benchCompoundRecords.lever.idealMA).toBe(old); expect(s.state().benchCompoundRecords.lever.usefulPower).toBe(power);
    for (const key of Object.keys(preserved)) expect(s.state()[key]).toBe(initial[key]); for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(initial[key]);
  });
  it('preserves exact v1 and v2 record shapes alongside all four v3 records', () => {
    const s = session(); s.edit('answer', '4'); s.edit('unit', 'ratio'); s.click('check'); s.click('save'); expect(s.state().benchCompoundRecords.lever.idealMA).toEqual(legacy());
    s.edit('question', 'usefulPower'); s.edit('answer', '40'); s.edit('unit', 'W'); s.click('check'); s.click('save'); expect(s.state().benchCompoundRecords.lever.usefulPower).toEqual(powerRecord());
    const first = s.state().benchCompoundRecords.lever.idealMA, second = s.state().benchCompoundRecords.lever.usefulPower;
    for (const kind of KINDS) { answer(s, kind); s.click('save'); }
    expect(s.state().benchCompoundRecords.lever.idealMA).toBe(first); expect(s.state().benchCompoundRecords.lever.usefulPower).toBe(second); expect(Object.keys(s.state().benchCompoundRecords.lever).sort()).toEqual(['idealMA', 'usefulPower', ...KINDS].sort());
    const retained = s.state().benchCompoundRecords.lever.budgetLoad; s.edit('budget', '200'); answer(s); s.click('save'); expect(s.state().benchCompoundRecords.lever.budgetLoad).toBe(retained);
  });
  it('keeps saved budget, time, stage geometry and task fixed after the workshop changes', () => {
    const s = session(); answer(s, 'budgetLoad'); s.edit('explanation', 'At 100 watts for five seconds, the load limit is 720 newtons.'); s.click('save'); const saved = s.state().benchCompoundRecords.lever.budgetLoad;
    s.edit('budget', '25'); s.edit('duration', '2'); s.edit('timeUnit', 'min'); s.edit('geometry-pulleySegments', '4'); s.patch({ leverLoad: 800, leverEffortArm: 4, view: 'learn', manualTopic: 'record' });
    expect(s.state().benchCompoundRecords.lever.budgetLoad).toBe(saved); const evidence = text(s.row('budgetLoad')); for (const snippet of ['720 N', '100 W', '5 s', '400 N', '80%', '90%', saved.explanation]) expect(evidence).toContain(snippet);
    expect(evidence).not.toContain('120 s');
  });
  it.each([
    ['legacy energy version', { version: 1 }], ['legacy power version', { version: 2 }], ['future version', { version: 4 }], ['missing time', { seconds: undefined }], ['typed time', { seconds: '5' }],
    ['time out of range', { seconds: 3601 }], ['missing budget', { budget: undefined }], ['typed budget', { budget: '100' }], ['null budget', { budget: null }], ['nonfinite budget', { budget: Infinity }],
    ['budget below range', { budget: 0.009 }], ['budget above range', { budget: 100001 }], ['wrong station', { benchId: 'pulley' }], ['same stage', { second: 'lever' }], ['incomplete geometry', { outputSettings: {} }],
    ['forged checked answer', { answer: '999' }], ['wrong time unit', { unit: 'min' }], ['invalid hints', { hint: 3 }], ['false completion', { completion: 'passed' }], ['oversized explanation', { explanation: 'x'.repeat(601) }]
  ])('omits imported planning evidence with %s', (_name, patch) => {
    const s = session(BENCHES[0], { benchCompoundRecords: { lever: { budgetTime: record(patch) } } }); expect(s.find(n => n.props?.['data-ml-compound-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.row()).toBeUndefined();
  });
  it('rejects v3 disguised as old skills and keeps seconds out of old solution records', () => {
    const bad = { idealMA: record({ question: 'idealMA', answer: '4', unit: 'ratio' }), usefulPower: record({ question: 'usefulPower', answer: '40', unit: 'W' }), budgetLoad: record() };
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', benchCompoundRecords: { lever: bad } }); for (const kind of Object.keys(bad)) expect(s.row(kind)).toBeUndefined();
    s.patch({ benchCompoundRecords: { lever: { idealMA: legacy({ unit: 's', completion: 'solution' }), usefulPower: powerRecord({ unit: 's', completion: 'solution' }) } } }); expect(s.row('idealMA')).toBeUndefined(); expect(s.row('usefulPower')).toBeUndefined();
  });
  it('recomputes imported planning values and exports literal fixed evidence safely', async () => {
    const imported = record({ question: 'budgetLoad', answer: '<script>literal</script>', unit: '', completion: 'solution', hint: 2, explanation: '<img src=x onerror=alert(1)> Hold movement fixed.', budgetLoad: 99999, budgetLabel: '99999 W' });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', leverLoad: 800, benchCompoundRecords: { lever: { budgetLoad: imported, idealMA: legacy(), usefulPower: powerRecord() } } });
    const evidence = text(s.row('budgetLoad')); for (const snippet of ['720 N', '100 W', '5 s', '400 N', '80%', '90%', 'Worked solution viewed', 'Hints opened: 2/2', imported.explanation]) expect(evidence).toContain(snippet);
    expect(evidence).not.toContain('99999'); expect(s.html()).not.toContain('<script>literal</script>'); expect(s.html()).not.toContain('<img src=x');
    const write = vi.fn(async () => true), descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard'); window.StemLab.writeClipboard = write; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try { s.refresh(); s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve(); expect(write).toHaveBeenCalledOnce(); const copied = write.mock.calls[0][0]; for (const snippet of ['720 N', '100 W', '5 s', '400 N', '80%', '90%', '40 W', imported.answer, imported.explanation]) expect(copied).toContain(snippet); expect(copied).not.toContain('99999'); }
    finally { if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else delete navigator.clipboard; }
  });
});
