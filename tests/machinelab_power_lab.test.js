import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Expected physics comes from these fixtures and equations, never production helpers.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'windlass', load: 'windlassLoad', radius: 'windlassHandleR', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', load: 'screwLoad', radius: 'screwHandleR', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const QUESTIONS = [
  { id: 'inputPower', unit: 'W' }, { id: 'usefulPower', unit: 'W' }, { id: 'lossPower', unit: 'W' },
  { id: 'handSpeed', unit: 'm/s' }, { id: 'loadSpeed', unit: 'm/s' }, { id: 'budgetTime', unit: 's' },
  { id: 'torque', unit: 'N·m', rotation: true }, { id: 'rpm', unit: 'rpm', rotation: true }
];
const skills = b => QUESTIONS.filter(q => !q.rotation || b.radius);
const CHALLENGES = BENCHES.flatMap(b => skills(b).map(q => ({ b, q, name: `${b.id}/${q.id}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function independent(b, d, percent = 80, seconds = 5, budget = 100) {
  const ma = b.ma(d), eta = percent / 100, out = d[b.load] * d.loadDistance, input = out / eta;
  const force = d[b.load] / (ma * eta), travel = d.loadDistance * ma, radius = b.radius ? d[b.radius] : null;
  const turns = radius ? travel / (2 * Math.PI * radius) : null;
  return { idealForce: d[b.load] / ma, force, travel, workOut: out, workIn: input,
    loss: Math.max(0, input - out), actualMA: ma * eta, efficiency: eta, seconds,
    inputPower: input / seconds, usefulPower: out / seconds, lossPower: (input - out) / seconds,
    handSpeed: travel / seconds, loadSpeed: d.loadDistance / seconds, budgetTime: input / budget,
    powerFits: input / seconds <= budget + 1e-9,
    torque: radius ? force * radius : null, turns, rpm: radius ? turns / seconds * 60 : null,
    omega: radius ? 2 * Math.PI * turns / seconds : null };
}
function settings(d, b) { return Object.fromEntries([...Object.keys(b.settings), 'loadDistance'].map(k => [k, d[k]])); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE,
    benchDesignLimits: { [b.id]: { force: '5000', travel: '300' } }, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn();
  // Cache one large station tree per immutable state; each event invalidates it.
  let renderedState, renderedTree;
  const render = () => {
    if (renderedState !== store.toolData.machineLab) {
      renderedState = store.toolData.machineLab;
      renderedTree = tool.render(makeCtx({ awardXP, tryAward }, store));
    }
    return renderedTree;
  };
  const find = predicate => nodes(render()).find(predicate);
  const byId = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-power-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { render, find, store, awardXP, tryAward, byId, action, invoke, refresh: () => { renderedState = undefined; },
    state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-power'] === store.toolData.machineLab.bench),
    metric: name => find(n => n.props?.['data-ml-power-metric'] === name),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix} input`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    recordRow: (id = b.id, question = 'inputPower') => find(n => n.props?.['data-ml-power-record-station'] === id && n.props?.['data-ml-power-record-skill'] === question),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q = QUESTIONS[0], value) {
  s.edit('question', q.id);
  if (value === undefined) value = independent(BENCHES.find(b => b.id === s.state().bench), s.state())[q.id];
  s.edit('answer', value); s.edit('unit', q.unit); s.click('check');
}
function saved(extra = {}) {
  return { version: 1, benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 },
    percent: 80, seconds: 5, budget: 100, question: 'inputPower', answer: '50', unit: 'W', hint: 0, completion: 'checked', ...extra };
}

describe('Machine Lab: power motion physics', () => {
  it.each(BENCHES)('conserves work and independently computes rates for $id', b => {
    for (const [percent, seconds, budget] of [[80, 5, 100], [100, 120, 50], [1, 0.01, 100000], [37.5, 3600, 0.01]]) {
      const result = tool._math.powerMotion(BASE[b.load], BASE.loadDistance, b.ma(BASE), percent, seconds, budget, b.radius ? BASE[b.radius] : null);
      const expected = independent(b, BASE, percent, seconds, budget);
      expect(result).toBeTruthy();
      for (const [key, value] of Object.entries(expected)) {
        if (value === null || typeof value === 'boolean') expect(result[key], key).toBe(value);
        else expect(result[key], key).toBeCloseTo(value, 7);
      }
      expect(result.inputPower * seconds).toBeCloseTo(result.workIn, 8);
      expect(result.usefulPower + result.lossPower).toBeCloseTo(result.inputPower, 7);
      expect(result.force * result.handSpeed).toBeCloseTo(result.inputPower, 7);
      expect(result.budgetTime * budget).toBeCloseTo(result.workIn, 7);
      if (b.radius) expect(result.torque * result.omega).toBeCloseTo(result.inputPower, 7);
    }
  });

  it.each(['load', 'movement', 'mechanical advantage', 'efficiency', 'duration', 'power budget'].map((name, index) => ({ name, index })))('rejects invalid $name without coercion', ({ index }) => {
    for (const value of [null, undefined, '', '5', true, {}, NaN, Infinity, -Infinity, -1, 0]) {
      const args = [400, 0.5, 2, 80, 5, 100]; args[index] = value;
      expect(tool._math.powerMotion(...args), String(value)).toBeNull();
    }
  });

  it('enforces duration, budget and efficiency endpoints and rejects overflowing results', () => {
    for (const [index, value] of [[3, 0.999], [3, 100.001], [4, 0.009], [4, 3600.001], [5, 0.009], [5, 100000.001]]) {
      const args = [400, 0.5, 2, 80, 5, 100]; args[index] = value; expect(tool._math.powerMotion(...args)).toBeNull();
    }
    for (const args of [[Number.MAX_VALUE, 2, 2, 80, 5, 100], [400, 2, Number.MAX_VALUE, 80, 5, 100], [Number.MAX_VALUE, 0.5, 2, 100, 0.01, 100]]) expect(tool._math.powerMotion(...args)).toBeNull();
  });

  it('distinguishes absent rotation from invalid radius and rejects overflow in rotation', () => {
    for (const radius of [undefined, null]) expect(tool._math.powerMotion(400, 0.5, 2, 80, 5, 100, radius)).toMatchObject({ torque: null, turns: null, rpm: null, omega: null });
    for (const radius of ['', '0.45', true, 0, -1, NaN, Infinity, Number.MIN_VALUE, Number.MAX_VALUE]) expect(tool._math.powerMotion(400, 0.5, 2, 80, 5, 100, radius)).toBeNull();
  });

  it('changes time and efficiency with the expected invariant geometry and inverse rate relationships', () => {
    const calculate = (efficiency, time, budget = 100) => tool._math.powerMotion(400, 0.5, 2, efficiency, time, budget);
    const first = calculate(80, 5), slower = calculate(80, 10), ideal = calculate(100, 5), stronger = calculate(80, 5, 200);
    for (const key of ['force', 'travel', 'workIn', 'workOut', 'loss', 'budgetTime']) expect(slower[key]).toBe(first[key]);
    for (const key of ['inputPower', 'usefulPower', 'lossPower', 'handSpeed', 'loadSpeed']) expect(slower[key]).toBe(first[key] / 2);
    expect(ideal.handSpeed).toBe(first.handSpeed); expect(ideal.loadSpeed).toBe(first.loadSpeed); expect(ideal.usefulPower).toBe(first.usefulPower);
    expect(ideal.lossPower).toBe(0); expect(stronger.budgetTime).toBe(first.budgetTime / 2); expect(stronger.inputPower).toBe(first.inputPower);
  });
});

describe('Machine Lab: optional power comparison', () => {
  it.each(BENCHES)('shows independent $id power and motion metrics without mutating render state', b => {
    const s = session(b), before = s.state(), expected = independent(b, before);
    expect(s.panel().type).toBe('details'); expect(s.panel().props.open).not.toBe(true);
    for (const [key, value] of Object.entries({ percent: '80', duration: '5', timeUnit: 's', budget: '100', question: 'inputPower' })) expect(s.byId(key).props.value).toBe(value);
    for (const key of ['inputPower', 'usefulPower', 'lossPower', 'handSpeed', 'loadSpeed', 'budgetTime', ...(b.radius ? ['torque', 'rpm'] : [])]) {
      expect(Number(s.metric(key).props['data-value']), key).toBeCloseTo(expected[key], 10); expect(text(s.metric(key))).not.toMatch(/NaN|Infinity/);
    }
    expect(s.state()).toBe(before); expect(before.benchPower).toBeUndefined(); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true);
    expect(text(s.panel())).toMatch(/assum|assumed/i);
  });

  it.each(['k2', 'g35', 'g68', 'g912'])('gates the optional power lab for %s', bandOverride => {
    const s = session(BENCHES[0], { bandOverride }); expect(!!s.panel()).toBe(['g68', 'g912'].includes(bandOverride));
  });

  it.each(BENCHES)('offers rotation practice only for a rotating handle on $id', b => {
    const s = session(b), values = nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value);
    expect(values).toEqual(skills(b).map(q => q.id).concat(['budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'], b.radius ? ['turns', 'angularTravel', 'omega', 'rotationalWork', 'rotationalPower'] : []));
    expect(!!s.metric('torque')).toBe(!!b.radius); expect(!!s.metric('rpm')).toBe(!!b.radius);
  });

  it.each(BENCHES)('compares half, equal and double task times for $id while preserving input work', b => {
    const s = session(b), before = s.state(), expected = independent(b, before);
    for (const factor of [0.5, 1, 2]) {
      const row = s.find(n => n.props?.['data-ml-power-pace-factor'] === String(factor)); expect(row).toBeTruthy();
      expect(row.props['data-seconds']).toBe(5 * factor); expect(row.props['data-input-power']).toBeCloseTo(expected.inputPower / factor, 10);
      expect(row.props['data-hand-speed']).toBeCloseTo(expected.handSpeed / factor, 10); expect(row.props['data-work-in']).toBe(expected.workIn);
    }
    expect(s.state()).toBe(before);
  });

  it('compares the mechanical input-power budget with the requested task duration', () => {
    const s = session(), fit = () => s.find(n => n.props?.['data-ml-power-fit'] !== undefined).props['data-ml-power-fit'];
    s.edit('budget', '50'); expect(fit()).toBe('true'); s.edit('budget', '49.999999'); expect(fit()).toBe('false');
    s.edit('duration', '10'); expect(fit()).toBe('true'); expect(Number(s.metric('inputPower').props['data-value'])).toBe(25);
  });

  it('converts two minutes to 120 seconds for every rate and budget calculation', () => {
    const s = session(); s.edit('duration', '2'); s.edit('timeUnit', 'min');
    const expected = independent(BENCHES[0], s.state(), 80, 120, 100);
    for (const key of ['inputPower', 'usefulPower', 'lossPower', 'handSpeed', 'loadSpeed', 'budgetTime']) expect(Number(s.metric(key).props['data-value']), key).toBeCloseTo(expected[key], 12);
    answer(s, QUESTIONS[0], Number(expected.inputPower.toPrecision(3))); s.click('save'); expect(s.state().benchPowerRecords.lever.inputPower.seconds).toBe(120);
  });

  it('keeps this assumption independent from the existing efficiency lab and ideal task', () => {
    const existing = { lever: { percent: '40' } }, records = { other: { keep: true } }, s = session(BENCHES[0], { benchEfficiency: existing, benchEfficiencyRecords: records }), before = s.state();
    expect(Number(s.metric('inputPower').props['data-value'])).toBe(50); s.edit('percent', '50'); expect(Number(s.metric('inputPower').props['data-value'])).toBe(80);
    expect(s.state().benchEfficiency).toBe(existing); expect(s.state().benchEfficiencyRecords).toBe(records);
    expect({ ...s.state(), benchPower: before.benchPower }).toEqual(before);
  });

  it.each([
    ['percent', ''], ['percent', '0.9'], ['percent', '100.1'], ['percent', '1e2'],
    ['duration', ''], ['duration', '0.009'], ['duration', '3600.1'], ['duration', 'Infinity'],
    ['budget', ''], ['budget', '0.009'], ['budget', '100000.1'], ['budget', '100 W']
  ])('rejects malformed or out-of-range %s draft %j', (key, value) => {
    const s = session(); s.edit(key, value); expect(s.byId(key).props.value).toBe(value); expect(s.byId(key).props['aria-invalid']).toBe(true);
    expect(s.metric('inputPower')).toBeUndefined(); expect(s.action('check')).toBeUndefined(); expect(s.action('save')).toBeUndefined(); expect(text(s.panel())).not.toMatch(/NaN|Infinity/);
  });

  it('applies duration limits after minute conversion', () => {
    const s = session(); s.edit('timeUnit', 'min'); s.edit('duration', '60'); expect(s.metric('inputPower')).toBeTruthy();
    s.edit('duration', '60.001'); expect(s.byId('duration').props['aria-invalid']).toBe(true); expect(s.metric('inputPower')).toBeUndefined();
  });

  it.each([['zero load', { leverLoad: 0 }], ['typed geometry', { leverEffortArm: '2' }], ['missing geometry', { leverLoadArm: null }], ['nonfinite geometry', { leverEffortArm: Infinity }], ['movement range', { loadDistance: 3.1 }]])('keeps invalid %s out of power calculations', (_label, patch) => {
    const s = session(BENCHES[0], patch), before = s.state(); expect(s.panel()).toBeTruthy(); expect(s.metric('inputPower')).toBeUndefined(); expect(s.action('check')).toBeUndefined(); expect(s.state()).toBe(before);
  });

  it('labels interactive fields and politely announces answers without exposing a solution by default', () => {
    const s = session(), all = nodes(s.panel());
    for (const key of ['percent', 'duration', 'timeUnit', 'budget', 'question', 'answer', 'unit']) expect(all.some(n => n.type === 'label' && n.props.htmlFor === s.byId(key).props.id), key).toBe(true);
    expect(s.byId('answer').props.inputMode).toBe('decimal'); expect(s.result()).toBeUndefined(); expect(all.some(n => n.props?.role === 'status' && n.props['aria-live'] === 'polite')).toBe(true);
  });

  it('labels ramp load movement as vertical rise, preserving the meaning of its load distance', () => {
    const s = session(BENCHES[3]); expect(text(s.metric('loadSpeed'))).toMatch(/vertical rise/i); expect(Number(s.metric('loadSpeed').props['data-value'])).toBe(0.1);
  });
});

describe('Machine Lab: power skill grading', () => {
  it.each(CHALLENGES)('grades the independent three-significant-figure $name answer and unit', ({ b, q }) => {
    const s = session(b), expected = independent(b, s.state())[q.id]; answer(s, q, Number(expected.toPrecision(3)));
    expect(s.result()).toBe('correct'); expect(s.action('save').props.disabled).toBe(false); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });

  it.each(QUESTIONS)('requires the $unit unit for $id rather than accepting a correct number alone', q => {
    const s = session(q.rotation ? BENCHES[2] : BENCHES[0]); answer(s, q);
    for (const unit of ['', 'J', 'N']) { s.edit('unit', unit); s.click('check'); expect(s.result()).toBe('unit'); expect(s.byId('unit').props['aria-invalid']).toBe(true); expect(s.action('save').props.disabled).toBe(true); }
  });

  it.each(['', ' ', '-1', 'Infinity', 'NaN', '50 W', '5e1'])('rejects malformed answer %j before grading units', value => {
    const s = session(); s.edit('answer', value); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.byId('answer').props['aria-invalid']).toBe(true); expect(s.action('save').props.disabled).toBe(true);
  });

  it('accepts the one-percent boundary and rejects arithmetic immediately beyond it', () => {
    const s = session(); answer(s, QUESTIONS[0], 49.5); expect(s.result()).toBe('correct'); s.edit('answer', '50.5'); s.click('check'); expect(s.result()).toBe('correct');
    s.edit('answer', '50.50001'); s.click('check'); expect(s.result()).toBe('incorrect'); expect(s.action('save').props.disabled).toBe(true);
  });

  it('rejects zero for a small positive movement rate at the maximum duration', () => {
    const s = session(); s.edit('duration', '3600'); answer(s, QUESTIONS[4], 0); expect(s.result()).toBe('incorrect');
    s.edit('answer', '0.000139'); s.click('check'); expect(s.result()).toBe('correct');
  });

  it('accepts exact zero power loss at 100 percent efficiency without accepting a visible nonzero answer', () => {
    const s = session(); s.edit('percent', '100'); answer(s, QUESTIONS[2], 0); expect(s.result()).toBe('correct');
    s.edit('answer', '0.000001'); s.click('check'); expect(s.result()).toBe('incorrect');
  });

  it('preserves near-100-percent givens and accepts a tiny decimal loss answer without scientific notation', () => {
    const s = session(); s.edit('percent', '99.999999'); s.edit('question', 'lossPower');
    const given = text(s.find(n => n.props?.['data-ml-power-given'] !== undefined));
    expect(given).toContain('99.999999%'); expect(given).not.toContain('100%');
    expect(text(s.metric('lossPower'))).not.toMatch(/\d[eE][+-]?\d/); expect(Number(s.metric('lossPower').props['data-value'])).toBeGreaterThan(0);
    s.click('hint'); s.click('hint'); expect(text(s.panel())).toContain('0.99999999');
    s.edit('answer', '0'); s.edit('unit', 'W'); s.click('check'); expect(s.result()).toBe('incorrect');
    s.edit('answer', '0.0000004'); s.click('check'); expect(s.result()).toBe('correct');
  });

  it('checks on Enter without submitting another action', () => {
    const s = session(); s.edit('answer', '50'); s.edit('unit', 'W'); const preventDefault = vi.fn(); s.byId('answer').props.onKeyDown({ key: 'Enter', preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce(); expect(s.result()).toBe('correct');
  });
});

describe('Machine Lab: guided power skill practice', () => {
  it.each(QUESTIONS)('provides two progressive $id hints without credit or automatic reveal', q => {
    const s = session(q.rotation ? BENCHES[2] : BENCHES[0]); s.edit('question', q.id);
    expect(s.find(n => n.props?.['data-ml-power-hint-level'] !== undefined)).toBeUndefined();
    for (const level of [1, 2]) { s.click('hint'); expect(s.find(n => n.props?.['data-ml-power-hint-level'] !== undefined).props['data-ml-power-hint-level']).toBe(level); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true); }
    expect(s.action('hint').props.disabled).toBe(true); s.invoke(s.action('hint')); expect(s.state().benchPower[s.state().bench].hint).toBe(2);
  });

  it('keeps solution-viewed provenance after later edits and correct checking', () => {
    const s = session(); s.click('reveal'); expect(s.result()).toBe('solution'); expect(s.action('reveal').props.disabled).toBe(true);
    s.edit('answer', '50'); s.edit('unit', 'W'); s.click('check'); expect(s.result()).toBe('solution'); s.click('save'); expect(s.state().benchPowerRecords.lever.inputPower.completion).toBe('solution');
  });

  it.each([['percent', '70'], ['duration', '10'], ['timeUnit', 'min'], ['budget', '200'], ['question', 'handSpeed']])('resets the current attempt after the %s assumption changes', (key, value) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); s.edit(key, value);
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined();
    expect(s.state().benchPower.lever).toMatchObject({ answer: '', unit: '', hint: 0, checked: false, revealed: false });
  });

  it.each([['geometry', { leverEffortArm: 3 }], ['load', { leverLoad: 500 }], ['distance', { loadDistance: 0.6 }]])('clears visible practice after a %s change without writes during render', (_label, patch) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); const draft = s.state().benchPower; s.patch(patch); const before = s.state();
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true); expect(s.state()).toBe(before); expect(s.state().benchPower).toBe(draft);
  });

  it('keeps per-station drafts and ignores unrelated station geometry changes', () => {
    const s = session(); answer(s); const original = s.state().benchPower.lever; s.patch({ pulleyLoad: 500 }); expect(s.result()).toBe('correct');
    s.patch({ bench: 'pulley' }); expect(s.result()).toBeUndefined(); s.edit('duration', '10'); expect(s.state().benchPower.lever).toBe(original);
    s.patch({ bench: 'lever' }); expect(s.result()).toBe('correct'); expect(s.byId('duration').props.value).toBe('5');
  });

  it.each([['geometry', { leverEffortArm: 3 }], ['load', { leverLoad: 500 }], ['station', { bench: 'pulley' }], ['view', { view: 'learn' }], ['assumption', { benchPower: { lever: { duration: '10' } } }]])('rejects delayed actions and input handlers after the %s changes', (_label, patch) => {
    const s = session(); answer(s); const callbacks = ['check', 'hint', 'reveal', 'save', 'next'].map(s.action), input = s.byId('answer'); s.patch(patch); const before = s.state();
    callbacks.forEach(s.invoke); input.props.onChange({ target: { value: '999' } }); expect(s.state()).toBe(before);
  });

  it('rechecks the current answer before accepting a delayed save callback', () => {
    const s = session(); answer(s); const oldSave = s.action('save'); s.edit('answer', '1'); s.invoke(oldSave); expect(s.state().benchPowerRecords).toBeUndefined();
  });

  it('advances practice without silently saving or awarding progress', () => {
    const s = session(); answer(s); s.click('next'); expect(s.byId('question').props.value).not.toBe('inputPower'); expect(s.byId('answer').props.value).toBe('');
    expect(s.result()).toBeUndefined(); expect(s.state().benchPowerRecords).toBeUndefined(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
});

describe('Machine Lab: honest saved power skills', () => {
  it.each(BENCHES)('saves fixed $id settings and provenance without modifying other learning evidence', b => {
    const retained = { provenBenches: { lever: true }, benchDesignRecords: { other: { note: 'keep' } }, benchEfficiency: { other: { percent: '60' } }, benchEfficiencyRecords: { other: { note: 'keep' } },
      benchExperiments: { other: { note: 'keep evidence' } }, benchInvestigations: { other: { stage: 'predict' } }, benchReferences: { other: { leverLoad: 400 } }, benchDesignUndo: { other: { key: 'untouched' } } };
    const s = session(b, retained), initial = s.state(); answer(s); s.click('hint'); s.click('save');
    expect(s.state().benchPowerRecords[b.id].inputPower).toEqual({ version: 1, benchId: b.id, settings: settings(initial, b), percent: 80, seconds: 5, budget: 100,
      question: 'inputPower', answer: String(independent(b, initial).inputPower), unit: 'W', hint: 1, completion: 'checked' });
    for (const key of Object.keys(retained)) expect(s.state()[key]).toBe(initial[key]); for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(initial[key]);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });

  it('does not save unchecked, wrong or wrong-unit answers even when disabled callbacks are invoked', () => {
    const s = session(); s.invoke(s.action('save')); expect(s.state().benchPowerRecords).toBeUndefined();
    s.edit('answer', '50'); s.edit('unit', 'W'); s.invoke(s.action('save')); expect(s.state().benchPowerRecords).toBeUndefined();
    s.edit('answer', '1'); s.click('check'); s.invoke(s.action('save')); expect(s.state().benchPowerRecords).toBeUndefined();
    s.edit('answer', '50'); s.edit('unit', 'J'); s.click('check'); s.invoke(s.action('save')); expect(s.state().benchPowerRecords).toBeUndefined();
  });

  it('stores separate skills and replaces only the active skill in a bounded station map', () => {
    const other = { keep: true }, s = session(BENCHES[2], { benchPowerRecords: { pulley: other } });
    for (const q of skills(BENCHES[2])) { answer(s, q); s.click('save'); }
    expect(Object.keys(s.state().benchPowerRecords.windlass).sort()).toEqual(skills(BENCHES[2]).map(q => q.id).sort());
    const first = s.state().benchPowerRecords.windlass, preservedTorque = first.torque;
    s.edit('duration', '10'); answer(s, QUESTIONS[0], independent(BENCHES[2], s.state(), 80, 10).inputPower); s.click('save');
    expect(s.state().benchPowerRecords.windlass.torque).toBe(preservedTorque); expect(s.state().benchPowerRecords.windlass.inputPower).not.toBe(first.inputPower); expect(s.state().benchPowerRecords.pulley).toBe(other);
    expect(s.find(n => n.props?.['data-ml-power-count'] !== undefined).props['data-ml-power-count']).toBe(8);
    s.patch({ view: 'learn', manualTopic: 'record' }); for (const q of skills(BENCHES[2])) expect(s.recordRow('windlass', q.id), q.id).toBeTruthy();
  });

  it('permits a worked solution without an answer and labels that evidence honestly', () => {
    const s = session(); s.click('reveal'); s.click('save'); expect(s.state().benchPowerRecords.lever.inputPower).toMatchObject({ answer: '', unit: '', hint: 0, completion: 'solution' });
    s.patch({ view: 'learn', manualTopic: 'record' }); expect(text(s.recordRow())).toContain('Worked solution viewed'); expect(text(s.recordRow())).toContain('Entered answer: none');
  });

  it('preserves saved assumptions and geometry across Apply, Undo and later settings', () => {
    const s = session(); answer(s); s.click('save'); const original = s.state().benchPowerRecords.lever.inputPower;
    const trial = s.find(n => n.type === 'button' && n.props['data-ml-task-use'] === 'load'); expect(trial.props.disabled).toBe(false); s.invoke(trial);
    expect(s.state().leverLoad).toBe(800); expect(s.result()).toBeUndefined(); expect(s.state().benchPowerRecords.lever.inputPower).toBe(original);
    s.invoke(s.find(n => n.type === 'button' && n.props['data-ml-design-undo-use'] === 'lever')); expect(s.state().leverLoad).toBe(400);
    s.edit('duration', '20'); s.edit('percent', '50'); s.edit('budget', '200'); s.patch({ leverLoad: 700, view: 'learn', manualTopic: 'record' });
    expect(s.state().benchPowerRecords.lever.inputPower).toBe(original); expect(text(s.recordRow())).toContain('50 W'); expect(text(s.recordRow())).toContain('80%');
  });

  it.each([
    ['version', { version: 2 }], ['wrong station', { benchId: 'pulley' }], ['missing settings', { settings: { leverLoad: 400 } }],
    ['typed efficiency', { percent: '80' }], ['efficiency range', { percent: 101 }], ['typed duration', { seconds: '5' }], ['duration range', { seconds: 3601 }],
    ['typed budget', { budget: '100' }], ['budget range', { budget: 0 }], ['unsupported skill', { question: 'torque' }],
    ['invalid unit', { unit: 'kg' }], ['invalid hints', { hint: 3 }], ['invalid completion', { completion: 'passed' }],
    ['forged answer', { answer: '999' }], ['forged unit', { unit: 'J' }], ['long answer', { answer: '2'.repeat(65) }]
  ])('omits imported power evidence with %s', (_label, patch) => {
    const s = session(BENCHES[0], { benchPowerRecords: { lever: { inputPower: saved(patch) } } });
    expect(s.find(n => n.props?.['data-ml-power-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow()).toBeUndefined();
  });

  it('ignores mismatched record keys and unsupported extra skills', () => {
    const s = session(BENCHES[0], { benchPowerRecords: { lever: { usefulPower: saved(), unknownSkill: saved() } } });
    expect(s.find(n => n.props?.['data-ml-power-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow('lever', 'usefulPower')).toBeUndefined(); expect(s.recordRow('lever', 'unknownSkill')).toBeUndefined();
  });

  it('recomputes imported results and exports escaped literal answers with solution and hint provenance', async () => {
    const record = saved({ completion: 'solution', answer: '<script>literal</script>', unit: '', hint: 2, inputPower: 9999, rpm: 9999 });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', leverLoad: 900, leverEffortArm: 4, benchPowerRecords: { lever: { inputPower: record } } });
    const evidence = text(s.recordRow());
    for (const snippet of ['80%', '400 N', '50 W', '250 J', '200 J', '5 s', 'Worked solution viewed', 'Hints opened: 2/2']) expect(evidence).toContain(snippet);
    expect(evidence).not.toContain('9999'); expect(s.html()).not.toContain('<script>literal</script>');
    const write = vi.fn(async () => true), clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard'); window.StemLab.writeClipboard = write;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try {
      s.refresh(); s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve(); expect(write).toHaveBeenCalledOnce();
      const copied = write.mock.calls[0][0]; for (const snippet of ['80%', '50 W', '250 J', '200 J', '5 s', 'Worked solution viewed', 'Hints opened: 2/2', record.answer]) expect(copied).toContain(snippet); expect(copied).not.toContain('9999');
    } finally { if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor); else delete navigator.clipboard; }
  });
});
