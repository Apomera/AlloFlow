import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Independent stage fixtures and equations; production helpers are never the oracle.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', geometry: { leverEffortArm: 2, leverLoadArm: 1 }, loadValue: 400, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', geometry: { pulleySegments: 2 }, loadValue: 400, ma: d => d.pulleySegments },
  { id: 'windlass', load: 'windlassLoad', geometry: { windlassHandleR: 0.45, windlassDrumR: 0.1 }, loadValue: 400, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', load: 'rampLoad', geometry: { rampLength: 4, rampHeight: 1 }, loadValue: 400, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', geometry: { wedgeLength: 0.3, wedgeThickness: 0.06 }, loadValue: 800, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', load: 'screwLoad', geometry: { screwHandleR: 0.15, screwPitch: 0.005 }, loadValue: 2000, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => ({ ...b.geometry, [b.load]: b.loadValue })));
const QUESTIONS = [
  { id: 'idealMA', unit: 'ratio' }, { id: 'efficiency', unit: '%' }, { id: 'actualMA', unit: 'ratio' },
  { id: 'inputForce', unit: 'N' }, { id: 'inputTravel', unit: 'm' }, { id: 'transferForce', unit: 'N' },
  { id: 'inputWork', unit: 'J' }, { id: 'firstLoss', unit: 'J' }, { id: 'secondLoss', unit: 'J' }
];
const POWER_KINDS = ['inputPower', 'transferPower', 'usefulPower', 'firstLossPower', 'secondLossPower'];
const PAIRS = BENCHES.flatMap(first => BENCHES.filter(second => second !== first).map(second => ({ first, second, name: `${first.id}/${second.id}` })));
const CHALLENGES = BENCHES.flatMap(b => QUESTIONS.map(q => ({ b, q, name: `${b.id}/${q.id}` })));
const defaultSecond = b => BENCHES.find(x => x.id === (b.id === 'pulley' ? 'lever' : 'pulley'));
const geometry = (b, state = BASE) => Object.fromEntries(Object.keys(b.geometry).map(k => [k, state[k]]));
const strings = object => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, String(value)]));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function independent(load, distance, firstMA, secondMA, firstPercent = 80, secondPercent = 90) {
  const firstEta = firstPercent / 100, secondEta = secondPercent / 100;
  const idealMA = firstMA * secondMA, workOut = load * distance;
  const transferWork = workOut / secondEta, inputWork = transferWork / firstEta;
  const firstLoss = Math.max(0, inputWork - transferWork), secondLoss = Math.max(0, transferWork - workOut);
  return { idealMA, efficiency: firstPercent * secondPercent / 100, actualMA: idealMA * firstEta * secondEta,
    inputForce: load / (idealMA * firstEta * secondEta), inputTravel: distance * idealMA,
    transferForce: load / (secondMA * secondEta), transferTravel: distance * secondMA,
    workOut, transferWork, inputWork, firstLoss, secondLoss, totalLoss: firstLoss + secondLoss };
}
function expected(s) {
  const d = s.state(), first = BENCHES.find(b => b.id === d.bench), draft = d.benchCompound?.[first.id] || {}, second = BENCHES.find(b => b.id === (draft.second || defaultSecond(first).id));
  const output = draft.geometry ? Object.fromEntries(Object.entries(draft.geometry).map(([k, v]) => [k, Number(v)])) : second.geometry;
  return independent(d[first.load], d.loadDistance, first.ma(d), second.ma(output), Number(draft.percentIn ?? 80), Number(draft.percentOut ?? 90));
}
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE,
    benchDesignLimits: { [b.id]: { force: '5000', travel: '300' } }, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn();
  let renderedState, renderedTree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; renderedTree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return renderedTree; };
  const find = predicate => nodes(render()).find(predicate);
  const byId = suffix => find(n => n.props?.id === `ml-compound-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-compound-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { render, find, store, awardXP, tryAward, byId, action, invoke, refresh: () => { renderedState = undefined; },
    state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-compound'] === store.toolData.machineLab.bench),
    metric: key => find(n => n.props?.['data-ml-compound-metric'] === key),
    result: () => find(n => n.props?.['data-ml-compound-result'] !== undefined)?.props['data-ml-compound-result'],
    edit: (suffix, value) => { const node = byId(suffix); expect(node, `Missing ${suffix} field`).toBeTruthy(); node.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const node = action(kind); expect(node?.props.disabled).not.toBe(true); invoke(node); },
    recordRow: (id = b.id, question = 'idealMA') => find(n => n.props?.['data-ml-compound-record-station'] === id && n.props?.['data-ml-compound-record-skill'] === question),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q = QUESTIONS[0], value) {
  s.edit('question', q.id); s.edit('answer', value === undefined ? expected(s)[q.id] : value); s.edit('unit', q.unit); s.click('check');
}
function saved(extra = {}) {
  return { version: 1, benchId: 'lever', second: 'pulley', inputSettings: { ...BENCHES[0].geometry }, outputSettings: { ...BENCHES[1].geometry },
    load: 400, loadDistance: 0.5, percentIn: 80, percentOut: 90, question: 'idealMA', answer: '4', unit: 'ratio', hint: 0, completion: 'checked', explanation: '', ...extra };
}

describe('Machine Lab: compound physics', () => {
  it.each(PAIRS)('independently computes the ordered $name pair and its energy ledger', ({ first, second }) => {
    for (const [percentIn, percentOut] of [[80, 90], [100, 100], [1, 1], [37.5, 99.999999]]) {
      const args = [first.loadValue, 0.5, first.ma(BASE), second.ma(BASE), percentIn, percentOut];
      const actual = tool._math.compoundWork(...args), want = independent(...args);
      expect(actual).toBeTruthy();
      for (const [key, value] of Object.entries(want)) expect(actual[key], key).toBeCloseTo(value, 7);
      expect(actual.inputForce * actual.inputTravel).toBeCloseTo(actual.inputWork, 7);
      expect(actual.transferForce * actual.transferTravel).toBeCloseTo(actual.transferWork, 7);
      expect(actual.workOut + actual.firstLoss + actual.secondLoss).toBeCloseTo(actual.inputWork, 7);
      expect(actual.firstLoss).toBeGreaterThanOrEqual(0); expect(actual.secondLoss).toBeGreaterThanOrEqual(0);
      expect(actual.workOut / actual.inputWork * 100).toBeCloseTo(actual.efficiency, 10);
    }
  });
  it.each(['load', 'movement', 'input MA', 'output MA', 'input efficiency', 'output efficiency'].map((name, index) => ({ name, index })))('rejects invalid $name without coercion', ({ index }) => {
    for (const value of [null, undefined, '', '2', true, {}, NaN, Infinity, -Infinity, 0, -1]) { const args = [400, 0.5, 2, 2, 80, 90]; args[index] = value; expect(tool._math.compoundWork(...args), String(value)).toBeNull(); }
  });
  it('enforces both efficiency endpoints and rejects overflowing derived quantities', () => {
    for (const index of [4, 5]) for (const value of [0.999999, 100.000001]) { const args = [400, 0.5, 2, 2, 80, 90]; args[index] = value; expect(tool._math.compoundWork(...args)).toBeNull(); }
    for (const args of [[Number.MAX_VALUE, 2, 2, 2, 80, 90], [400, 1, Number.MAX_VALUE, 2, 80, 90], [400, 1, 2, Number.MIN_VALUE, 80, 90]]) expect(tool._math.compoundWork(...args)).toBeNull();
  });
  it('keeps geometry invariant under efficiency and changes the intermediate stage when order reverses', () => {
    const a = tool._math.compoundWork(400, 0.5, 2, 4, 80, 90), b = tool._math.compoundWork(400, 0.5, 4, 2, 90, 80), ideal = tool._math.compoundWork(400, 0.5, 2, 4, 100, 100);
    for (const key of ['idealMA', 'inputForce', 'inputTravel', 'inputWork', 'totalLoss']) expect(b[key]).toBeCloseTo(a[key], 10);
    expect(b.transferForce).not.toBe(a.transferForce); expect(b.transferTravel).not.toBe(a.transferTravel); expect(b.firstLoss).not.toBe(a.firstLoss);
    expect(ideal.inputTravel).toBe(a.inputTravel); expect(ideal.transferTravel).toBe(a.transferTravel); expect(ideal.totalLoss).toBe(0); expect(ideal.efficiency).toBe(100);
  });
});

describe('Machine Lab: optional compound comparison', () => {
  it.each(BENCHES)('shows independent $id stage metrics without render-time writes', b => {
    const s = session(b), before = s.state(), want = expected(s);
    expect(s.panel().type).toBe('details'); expect(s.panel().props.open).not.toBe(true);
    for (const [key, value] of Object.entries({ second: defaultSecond(b).id, percentIn: '80', percentOut: '90', question: 'idealMA' })) expect(s.byId(key).props.value).toBe(value);
    for (const key of ['idealMA', 'efficiency', 'actualMA', 'inputForce', 'inputTravel', 'transferForce', 'transferTravel', 'workOut', 'transferWork', 'inputWork', 'firstLoss', 'secondLoss', 'totalLoss']) {
      expect(Number(s.metric(key).props['data-value']), key).toBeCloseTo(want[key], 10); expect(text(s.metric(key))).not.toMatch(/NaN|Infinity/);
    }
    expect(s.state()).toBe(before); expect(before.benchCompound).toBeUndefined(); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true);
    expect(text(s.panel())).toMatch(/assum|assumed/i);
  });
  it.each(['k2', 'g35', 'g68', 'g912'])('gates the optional compound lab for %s', bandOverride => {
    const s = session(BENCHES[0], { bandOverride }); expect(!!s.panel()).toBe(['g68', 'g912'].includes(bandOverride));
  });
  it.each(BENCHES)('offers five different output stages and all fourteen skills for $id', b => {
    const s = session(b), options = suffix => nodes(s.byId(suffix)).filter(n => n.type === 'option').map(n => n.props.value);
    expect(options('second').filter(Boolean)).toEqual(BENCHES.filter(x => x !== b).map(x => x.id)); expect(options('second')).toContain(''); expect(options('question')).toEqual([...QUESTIONS.map(q => q.id), ...POWER_KINDS]);
    expect(options('unit')).toEqual(expect.arrayContaining(['ratio', '%', 'N', 'm', 'J', 'W']));
  });
  it('uses independent default output geometry and permits editing it without altering either workshop', () => {
    const s = session(BENCHES[0], { pulleySegments: 6 }), before = s.state();
    expect(s.byId('geometry-pulleySegments').props.value).toBe('2'); expect(Number(s.metric('idealMA').props['data-value'])).toBe(4);
    s.edit('geometry-pulleySegments', '4'); expect(Number(s.metric('idealMA').props['data-value'])).toBe(8);
    expect(s.state().pulleySegments).toBe(6); expect(s.state().leverEffortArm).toBe(2); expect({ ...s.state(), benchCompound: before.benchCompound }).toEqual(before);
  });
  it.each(BENCHES)('shows a consistent input, transfer and output ledger for $id', b => {
    const s = session(b), model = expected(s), rows = [
      ['input', model.inputForce, model.inputTravel, model.inputWork],
      ['transfer', model.transferForce, model.transferTravel, model.transferWork],
      ['output', s.state()[b.load], s.state().loadDistance, model.workOut]
    ];
    for (const [stage, force, travel, work] of rows) { const row = s.find(n => n.props?.['data-ml-compound-stage'] === stage); expect(row, stage).toBeTruthy(); expect(row.props['data-force']).toBeCloseTo(force, 10); expect(row.props['data-travel']).toBeCloseTo(travel, 10); expect(row.props['data-work']).toBeCloseTo(work, 10); }
  });
  it('explains whether an added input stage decreases, preserves or increases required effort', () => {
    const s = session(), cause = () => s.find(n => n.props?.['data-ml-compound-added-stage'] !== undefined).props['data-ml-compound-added-stage'];
    expect(cause()).toBe('less'); s.edit('percentIn', '50'); expect(cause()).toBe('same'); s.edit('percentIn', '40'); expect(cause()).toBe('more');
    expect(Number(s.metric('inputForce').props['data-value'])).toBeGreaterThan(Number(s.metric('transferForce').props['data-value']));
  });
  it.each(BENCHES.filter(b => b.id !== 'lever'))('accepts independent $id output geometry and omits its unrelated load field', second => {
    const s = session(); s.edit('second', second.id);
    for (const [key, value] of Object.entries(second.geometry)) expect(s.byId(`geometry-${key}`).props.value).toBe(String(value));
    expect(s.byId(`geometry-${second.load}`)).toBeUndefined(); expect(Number(s.metric('idealMA').props['data-value'])).toBeCloseTo(2 * second.ma(BASE), 10);
  });
  it.each([['percentIn', ''], ['percentIn', '0.9'], ['percentIn', '100.1'], ['percentIn', '1e2'], ['percentOut', ''], ['percentOut', 'Infinity'], ['percentOut', '-1'], ['percentOut', '80%'], ['geometry-pulleySegments', ''], ['geometry-pulleySegments', '1.5'], ['geometry-pulleySegments', '99']])('rejects malformed or out-of-range %s draft %j', (key, value) => {
    const s = session(); s.edit(key, value); expect(s.byId(key).props.value).toBe(value); expect(s.byId(key).props['aria-invalid']).toBe(true);
    expect(s.metric('idealMA')).toBeUndefined(); expect(s.action('check')).toBeUndefined(); expect(s.action('save')).toBeUndefined(); expect(text(s.panel())).not.toMatch(/NaN|Infinity/);
  });
  it.each([['load', { leverLoad: 0 }], ['typed input geometry', { leverEffortArm: '2' }], ['missing input geometry', { leverLoadArm: null }], ['nonfinite input geometry', { leverEffortArm: Infinity }], ['distance', { loadDistance: 3.1 }]])('omits calculation for invalid %s without render writes', (_label, patch) => {
    const s = session(BENCHES[0], patch), before = s.state(); expect(s.panel()).toBeTruthy(); expect(s.metric('idealMA')).toBeUndefined(); expect(s.action('check')).toBeUndefined(); expect(s.state()).toBe(before);
  });
  it('rejects impossible ramp geometry instead of calculating a shortened ramp', () => {
    const s = session(); s.edit('second', 'ramp'); s.edit('geometry-rampLength', '1'); s.edit('geometry-rampHeight', '2'); expect(s.metric('idealMA')).toBeUndefined(); expect(s.action('check')).toBeUndefined();
  });
  it.each([{ second: '' }, { second: 'lever' }, { second: 'unknown' }, { second: 'ramp', geometry: { rampLength: '4' } }])('keeps malformed imported output drafts invalid: %j', draft => {
    const s = session(BENCHES[0], { benchCompound: { lever: draft } }); expect(s.metric('idealMA')).toBeUndefined(); expect(s.action('check')).toBeUndefined();
  });
  it('labels controls and politely announces practice feedback', () => {
    const s = session(), all = nodes(s.panel());
    for (const suffix of ['second', 'geometry-pulleySegments', 'percentIn', 'percentOut', 'question', 'answer', 'unit', 'explanation']) expect(all.some(n => n.type === 'label' && n.props.htmlFor === s.byId(suffix).props.id), suffix).toBe(true);
    expect(s.byId('answer').props.inputMode).toBe('decimal'); expect(s.byId('explanation').props.maxLength).toBe(600); expect(all.some(n => n.props?.role === 'status' && n.props['aria-live'] === 'polite')).toBe(true);
  });
});

describe('Machine Lab: compound skill grading', () => {
  it.each(CHALLENGES)('grades the independent six-significant-figure $name answer and unit', ({ b, q }) => {
    const s = session(b), value = Number(expected(s)[q.id].toPrecision(6)); answer(s, q, value);
    expect(s.result()).toBe('correct'); expect(s.action('save').props.disabled).toBe(false); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(QUESTIONS)('requires the $unit unit for $id', q => {
    const s = session(); answer(s, q);
    for (const unit of ['', 'W']) { s.edit('unit', unit); s.click('check'); expect(s.result()).toBe('unit'); expect(s.byId('unit').props['aria-invalid']).toBe(true); expect(s.action('save').props.disabled).toBe(true); }
  });
  it.each(['', ' ', '-1', 'Infinity', 'NaN', '4 ratio', '4e0'])('rejects malformed answer %j before checking units', value => {
    const s = session(); s.edit('answer', value); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.byId('answer').props['aria-invalid']).toBe(true); expect(s.action('save').props.disabled).toBe(true);
  });
  it('accepts the one-percent boundary and rejects arithmetic beyond it', () => {
    const s = session(); s.edit('percentIn', '100'); s.edit('percentOut', '100'); answer(s, QUESTIONS[1], 99); expect(s.result()).toBe('correct'); s.edit('answer', '101'); s.click('check'); expect(s.result()).toBe('correct'); s.edit('answer', '101.000001'); s.click('check'); expect(s.result()).toBe('incorrect');
  });
  it('rejects zero for a tiny positive input force and accepts its decimal rounded value', () => {
    const s = session(BENCHES[0], { leverLoad: 10, leverEffortArm: 4, leverLoadArm: 0.2 }); s.edit('second', 'screw'); s.edit('geometry-screwHandleR', '0.5'); s.edit('geometry-screwPitch', '0.001'); s.edit('percentIn', '100'); s.edit('percentOut', '100');
    answer(s, QUESTIONS[3], 0); expect(s.result()).toBe('incorrect'); s.edit('answer', '0.000159155'); s.click('check'); expect(s.result()).toBe('correct'); expect(text(s.metric('inputForce'))).not.toMatch(/\d[eE][+-]?\d/);
  });
  it('accepts zero stage loss only for an ideal stage and preserves near-100-percent decimal givens', () => {
    const s = session(); s.edit('percentIn', '100'); answer(s, QUESTIONS[7], 0); expect(s.result()).toBe('correct');
    s.edit('answer', '0.000001'); s.click('check'); expect(s.result()).toBe('incorrect');
    s.edit('percentIn', '99.999999'); s.edit('percentOut', '100'); s.edit('question', 'firstLoss');
    expect(text(s.panel())).toContain('99.999999'); expect(text(s.metric('firstLoss'))).not.toMatch(/\d[eE][+-]?\d/);
    s.click('hint'); s.click('hint'); expect(text(s.panel())).toContain('0.99999999');
    s.edit('answer', '0'); s.edit('unit', 'J'); s.click('check'); expect(s.result()).toBe('incorrect'); s.edit('answer', '0.000002'); s.click('check'); expect(s.result()).toBe('correct');
  });
  it('checks on Enter without submitting a different action', () => {
    const s = session(); s.edit('answer', '4'); s.edit('unit', 'ratio'); const preventDefault = vi.fn(); s.byId('answer').props.onKeyDown({ key: 'Enter', preventDefault }); expect(preventDefault).toHaveBeenCalledOnce(); expect(s.result()).toBe('correct');
  });
});

describe('Machine Lab: guided compound practice', () => {
  it.each(QUESTIONS)('offers two progressive $id hints without awarding credit or revealing the answer', q => {
    const s = session(); s.edit('question', q.id); expect(s.find(n => n.props?.['data-ml-compound-hint-level'] !== undefined)).toBeUndefined();
    for (const level of [1, 2]) { s.click('hint'); expect(s.find(n => n.props?.['data-ml-compound-hint-level'] !== undefined).props['data-ml-compound-hint-level']).toBe(level); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true); }
    expect(s.action('hint').props.disabled).toBe(true); s.invoke(s.action('hint')); expect(s.state().benchCompound.lever.hint).toBe(2);
  });
  it('retains solution-viewed provenance after subsequent correct answers and explanations', () => {
    const s = session(); s.click('reveal'); expect(s.result()).toBe('solution'); expect(s.action('reveal').props.disabled).toBe(true);
    s.edit('answer', '4'); s.edit('unit', 'ratio'); s.edit('explanation', 'The stage ratios multiply.'); s.click('check'); expect(s.result()).toBe('solution'); s.click('save'); expect(s.state().benchCompoundRecords.lever.idealMA.completion).toBe('solution');
  });
  it('bounds explanation input without losing checked-answer provenance', () => {
    const s = session(); answer(s); s.edit('explanation', 'x'.repeat(601)); expect(s.byId('explanation').props.value).toHaveLength(600); expect(s.result()).toBe('correct'); s.click('save'); expect(s.state().benchCompoundRecords.lever.idealMA.explanation).toHaveLength(600); expect(s.state().benchCompoundRecords.lever.idealMA.completion).toBe('checked');
  });
  it.each([['second', 'ramp'], ['geometry-pulleySegments', '4'], ['percentIn', '70'], ['percentOut', '95'], ['question', 'inputWork']])('resets the attempt and explanation when %s changes', (key, value) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); s.edit('explanation', 'Previous reasoning'); s.edit(key, value);
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.byId('explanation').props.value).toBe(''); expect(s.result()).toBeUndefined();
    expect(s.state().benchCompound.lever).toMatchObject({ answer: '', unit: '', explanation: '', hint: 0, checked: false, revealed: false });
  });
  it.each([['geometry', { leverEffortArm: 3 }], ['load', { leverLoad: 500 }], ['distance', { loadDistance: 0.6 }]])('hides stale practice after a %s change without render-time writes', (_label, patch) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); s.edit('explanation', 'Earlier task'); const draft = s.state().benchCompound; s.patch(patch); const before = s.state();
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('explanation').props.value).toBe(''); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true); expect(s.state()).toBe(before); expect(s.state().benchCompound).toBe(draft);
  });
  it('preserves independent station drafts and ignores secondary workshop geometry and load changes', () => {
    const s = session(); answer(s); const original = s.state().benchCompound.lever;
    s.patch({ pulleySegments: 6, pulleyLoad: 900 }); expect(s.result()).toBe('correct'); expect(Number(s.metric('idealMA').props['data-value'])).toBe(4);
    s.patch({ bench: 'pulley' }); expect(s.result()).toBeUndefined(); s.edit('percentIn', '50'); expect(s.state().benchCompound.lever).toBe(original);
    s.patch({ bench: 'lever' }); expect(s.result()).toBe('correct'); expect(s.byId('percentIn').props.value).toBe('80');
  });
  it.each([['geometry', { leverEffortArm: 3 }], ['load', { leverLoad: 500 }], ['station', { bench: 'pulley' }], ['view', { view: 'learn' }], ['assumption', { benchCompound: { lever: { percentIn: '70' } } }]])('rejects delayed actions and inputs after the %s changes', (_label, patch) => {
    const s = session(); answer(s); const callbacks = ['check', 'hint', 'reveal', 'save', 'next'].map(s.action), inputs = ['answer', 'explanation', 'geometry-pulleySegments'].map(s.byId); s.patch(patch); const before = s.state();
    callbacks.forEach(s.invoke); inputs.forEach(n => n.props.onChange({ target: { value: '999' } })); expect(s.state()).toBe(before);
  });
  it('rechecks current answers before accepting a delayed save callback', () => {
    const s = session(); answer(s); const oldSave = s.action('save'); s.edit('answer', '1'); s.invoke(oldSave); expect(s.state().benchCompoundRecords).toBeUndefined();
  });
  it('cycles all fourteen skills without saving or awarding progress', () => {
    const s = session(), expectedKinds = [...QUESTIONS.map(q => q.id), ...POWER_KINDS], seen = [];
    for (let i = 0; i < expectedKinds.length; i++) { seen.push(s.byId('question').props.value); s.click('next'); }
    expect(seen).toEqual(expectedKinds); expect(s.byId('question').props.value).toBe('idealMA'); expect(s.byId('answer').props.value).toBe('');
    expect(s.result()).toBeUndefined(); expect(s.state().benchCompoundRecords).toBeUndefined(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
});

describe('Machine Lab: honest saved compound skills', () => {
  it.each(BENCHES)('saves fixed $id input and output settings without modifying existing evidence', b => {
    const retained = { provenBenches: { other: true }, benchDesignRecords: { other: { keep: true } }, benchEfficiency: { other: { percent: '60' } }, benchEfficiencyRecords: { other: { keep: true } },
      benchPower: { other: { duration: '5' } }, benchPowerRecords: { other: { keep: true } }, benchExperiments: { other: { keep: true } }, benchInvestigations: { other: { keep: true } }, benchReferences: { other: { keep: true } }, benchDesignUndo: { other: { keep: true } } };
    const s = session(b, retained), initial = s.state(); answer(s); s.click('hint'); s.edit('explanation', 'Input and output ratios multiply.'); s.click('save');
    expect(s.state().benchCompoundRecords[b.id].idealMA).toEqual({ version: 1, benchId: b.id, second: defaultSecond(b).id, inputSettings: geometry(b, initial), outputSettings: { ...defaultSecond(b).geometry },
      load: initial[b.load], loadDistance: initial.loadDistance, percentIn: 80, percentOut: 90, question: 'idealMA', answer: String(expected(s).idealMA), unit: 'ratio', hint: 1, completion: 'checked', explanation: 'Input and output ratios multiply.' });
    for (const key of Object.keys(retained)) expect(s.state()[key]).toBe(initial[key]); for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(initial[key]); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('does not save unchecked, wrong or wrong-unit answers even through disabled callbacks', () => {
    const s = session(); s.invoke(s.action('save')); expect(s.state().benchCompoundRecords).toBeUndefined();
    s.edit('answer', '4'); s.edit('unit', 'ratio'); s.invoke(s.action('save')); expect(s.state().benchCompoundRecords).toBeUndefined();
    s.edit('answer', '1'); s.click('check'); s.invoke(s.action('save')); expect(s.state().benchCompoundRecords).toBeUndefined();
    s.edit('answer', '4'); s.edit('unit', 'J'); s.click('check'); s.invoke(s.action('save')); expect(s.state().benchCompoundRecords).toBeUndefined();
  });
  it('stores all nine skills and replaces only the active record while retaining other station maps', () => {
    const other = { keep: true }, s = session(BENCHES[0], { benchCompoundRecords: { pulley: other } });
    for (const q of QUESTIONS) { answer(s, q); s.click('save'); }
    expect(Object.keys(s.state().benchCompoundRecords.lever).sort()).toEqual(QUESTIONS.map(q => q.id).sort());
    const first = s.state().benchCompoundRecords.lever, preserved = first.inputWork;
    s.edit('geometry-pulleySegments', '4'); answer(s); s.click('save'); expect(s.state().benchCompoundRecords.lever.inputWork).toBe(preserved); expect(s.state().benchCompoundRecords.lever.idealMA).not.toBe(first.idealMA); expect(s.state().benchCompoundRecords.pulley).toBe(other);
    expect(s.find(n => n.props?.['data-ml-compound-count'] !== undefined).props['data-ml-compound-count']).toBe(9);
    s.patch({ view: 'learn', manualTopic: 'record' }); for (const q of QUESTIONS) expect(s.recordRow('lever', q.id), q.id).toBeTruthy();
  });
  it('permits a worked solution without an answer and labels its evidence honestly', () => {
    const s = session(); s.click('reveal'); s.click('save'); expect(s.state().benchCompoundRecords.lever.idealMA).toMatchObject({ answer: '', unit: '', hint: 0, completion: 'solution', explanation: '' });
    s.patch({ view: 'learn', manualTopic: 'record' }); expect(text(s.recordRow())).toContain('Worked solution viewed'); expect(text(s.recordRow())).toContain('Entered answer: none');
  });
  it('retains saved evidence across Apply, Undo and later output edits', () => {
    const s = session(); answer(s); s.edit('explanation', 'Fixed initial explanation'); s.click('save'); const original = s.state().benchCompoundRecords.lever.idealMA;
    const trial = s.find(n => n.type === 'button' && n.props['data-ml-task-use'] === 'load'); expect(trial.props.disabled).toBe(false); s.invoke(trial); expect(s.state().leverLoad).toBe(800); expect(s.result()).toBeUndefined(); expect(s.state().benchCompoundRecords.lever.idealMA).toBe(original);
    s.invoke(s.find(n => n.type === 'button' && n.props['data-ml-design-undo-use'] === 'lever')); expect(s.state().leverLoad).toBe(400);
    s.edit('geometry-pulleySegments', '4'); s.edit('percentIn', '50'); s.patch({ leverLoad: 700, view: 'learn', manualTopic: 'record' }); expect(s.state().benchCompoundRecords.lever.idealMA).toBe(original); expect(text(s.recordRow())).toContain('80%'); expect(text(s.recordRow())).toContain('Fixed initial explanation');
  });
  it.each([
    ['version', { version: 2 }], ['wrong station', { benchId: 'pulley' }], ['same output stage', { second: 'lever' }], ['unknown output stage', { second: 'unknown' }],
    ['missing input geometry', { inputSettings: {} }], ['typed input geometry', { inputSettings: { leverEffortArm: '2', leverLoadArm: 1 } }], ['missing output geometry', { outputSettings: {} }], ['noninteger pulley', { outputSettings: { pulleySegments: 1.5 } }],
    ['typed load', { load: '400' }], ['invalid movement', { loadDistance: 4 }], ['typed input efficiency', { percentIn: '80' }], ['output efficiency range', { percentOut: 101 }],
    ['unsupported skill', { question: 'torque' }], ['invalid unit', { unit: 'kg' }], ['invalid hints', { hint: 3 }], ['invalid completion', { completion: 'passed' }],
    ['forged answer', { answer: '999' }], ['forged unit', { unit: 'J' }], ['long answer', { answer: '2'.repeat(65) }], ['long explanation', { explanation: 'x'.repeat(601) }], ['typed explanation', { explanation: 7 }]
  ])('omits imported compound evidence with %s', (_label, patch) => {
    const s = session(BENCHES[0], { benchCompoundRecords: { lever: { idealMA: saved(patch) } } }); expect(s.find(n => n.props?.['data-ml-compound-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow()).toBeUndefined();
  });
  it('ignores mismatched record keys and unsupported extra skills', () => {
    const s = session(BENCHES[0], { benchCompoundRecords: { lever: { inputWork: saved(), unknown: saved() } } }); expect(s.find(n => n.props?.['data-ml-compound-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow('lever', 'inputWork')).toBeUndefined(); expect(s.recordRow('lever', 'unknown')).toBeUndefined();
  });
  it('recomputes imported results and exports escaped literal answers and explanations with provenance', async () => {
    const record = saved({ completion: 'solution', answer: '<script>literal</script>', unit: '', hint: 2, explanation: '<img src=x onerror=alert(1)> My explanation', inputWork: 9999, idealMA: 9999 });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', leverLoad: 900, leverEffortArm: 4, benchCompoundRecords: { lever: { idealMA: record } } }), evidence = text(s.recordRow());
    for (const snippet of ['80%', '90%', '400 N', 'Worked solution viewed', 'Hints opened: 2/2', record.explanation]) expect(evidence).toContain(snippet); expect(evidence).not.toContain('9999'); expect(s.html()).not.toContain('<script>literal</script>'); expect(s.html()).not.toContain('<img src=x');
    const write = vi.fn(async () => true), clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard'); window.StemLab.writeClipboard = write; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try { s.refresh(); s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve(); expect(write).toHaveBeenCalledOnce(); const copied = write.mock.calls[0][0]; for (const snippet of [record.answer, record.explanation, '80%', '90%', 'Hints opened: 2/2', 'Worked solution viewed']) expect(copied).toContain(snippet); expect(copied).not.toContain('9999'); }
    finally { if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor); else delete navigator.clipboard; }
  });
});
