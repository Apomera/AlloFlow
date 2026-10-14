import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BENCHES = [
  { id: 'lever', load: 'leverLoad', min: 10, max: 1000, settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 } },
  { id: 'pulley', load: 'pulleyLoad', min: 10, max: 1000, settings: { pulleySegments: 2, pulleyLoad: 400 } },
  { id: 'ramp', load: 'rampLoad', min: 10, max: 1000, settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 } },
  { id: 'wedge', load: 'wedgeLoad', min: 10, max: 2000, settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 } },
  { id: 'windlass', load: 'windlassLoad', min: 10, max: 1000, settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 } },
  { id: 'screw', load: 'screwLoad', min: 50, max: 5000, settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 } }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const KINDS = ['time', 'efficiency', 'load', 'work'];
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ otherTool: { note: 'Keep other work' }, machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate);
  const id = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const prediction = () => find(n => n.props?.['data-ml-power-prediction'] === store.toolData.machineLab.bench);
  const action = kind => nodes(prediction()).find(n => n.type === 'button' && n.props?.['data-ml-power-prediction-action'] === kind);
  const choice = kind => nodes(prediction()).find(n => n.props?.['data-ml-power-prediction-choice'] === kind);
  const toggle = () => nodes(prediction()).find(n => n.props?.['data-ml-power-prediction-calculate'] !== undefined);
  const invoke = n => { expect(n).toBeTruthy(); n.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  const choose = kind => { const n = choice(kind); expect(n).toBeTruthy(); n.props.onChange({ target: { value: kind, checked: true } }); };
  const edit = (suffix, value) => { const n = id(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); };
  const result = attr => nodes(prediction()).find(n => n.props?.[attr])?.props[attr];
  return { b, render, find, id, prediction, action, choice, toggle, invoke, choose, edit, awardXP, tryAward,
    state: () => store.toolData.machineLab, allState: () => store.toolData,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    mode: checked => { const n = toggle(); expect(n).toBeTruthy(); n.props.onChange({ target: { checked } }); },
    number: value => edit('prediction-number', value), click: kind => invoke(action(kind)), kind: kind => edit('prediction-kind', kind),
    result: () => result('data-ml-power-prediction-result'), numericResult: () => result('data-ml-power-prediction-number-result'),
    calculationClick: kind => invoke(find(n => n.type === 'button' && n.props?.[`data-ml-power-${kind}`] !== undefined)) };
}
// Independent identities in SI units: useful work = load × movement,
// input work = useful work / efficiency, and average input power = work / time.
// No expected value is read from implementation helpers, DOM targets or records.
function expected(b, kind, { settings = BASE, seconds = 5, percent = 80 } = {}) {
  const energy = settings[b.load] * settings.loadDistance / (percent / 100);
  const old = kind === 'efficiency' ? percent : kind === 'load' ? settings[b.load] : seconds;
  const limit = kind === 'efficiency' ? 100 : kind === 'load' ? b.max : 3600;
  const factor = old * 2 <= limit ? 2 : 0.5;
  const before = kind === 'work' ? energy : energy / seconds;
  const after = kind === 'work' ? energy : kind === 'load' ? before * factor : before / factor;
  return { before, after, unit: kind === 'work' ? 'J' : 'W', answer: after === before ? 'same' : after < before ? 'half' : 'double' };
}
function close(actual, wanted) { expect(Number.isFinite(actual)).toBe(true); expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(Math.max(1e-15, Math.abs(wanted) * 1e-11)); }
function noComparison(s) {
  for (const suffix of ['metric', 'bar', 'equation', 'percent', 'percent-equation']) expect(nodes(s.prediction()).filter(n => n.props?.[`data-ml-power-prediction-${suffix}`] !== undefined)).toHaveLength(0);
}
function comparison(s, want) {
  const all = nodes(s.prediction()), metrics = all.filter(n => n.props?.['data-ml-power-prediction-metric']);
  expect(metrics.map(n => n.props['data-ml-power-prediction-metric']).sort()).toEqual(['after', 'before']);
  for (const name of ['before', 'after']) {
    const metric = metrics.find(n => n.props['data-ml-power-prediction-metric'] === name);
    expect(metric.props['data-unit']).toBe(want.unit); close(Number(metric.props['data-value']), want[name]);
  }
  const bars = all.filter(n => n.props?.['data-ml-power-prediction-bar']); expect(bars).toHaveLength(2);
  for (const bar of bars) close(parseFloat(bar.props.style.width), want[bar.props['data-ml-power-prediction-bar']] / Math.max(want.before, want.after) * 100);
  expect(all.filter(n => n.props?.['data-ml-power-prediction-equation'] !== undefined)).toHaveLength(1);
  expect(text(s.prediction())).not.toMatch(/NaN|Infinity|undefined/);
}
function ratio(s, want) { s.choose(want.answer); s.click('check'); expect(s.result()).toBe('correct'); }
function begin(s, kind) { s.kind(kind); s.mode(true); s.edit('prediction-target', 'percent'); expect(s.id('prediction-number').props.value).toBe(''); noComparison(s); }
function solve(s, kind, want) {
  begin(s, kind); ratio(s, want); noComparison(s); s.number(percent(want)); s.click('check-number');
  expect(s.numericResult()).toBe('correct'); percentComparison(s, want);
}
function onlyPredictionChanged(before, after) {
  const { benchPowerPredictions: _old, ...oldState } = before.machineLab;
  const { benchPowerPredictions: _new, ...newState } = after.machineLab;
  expect(newState).toEqual(oldState); expect(after.otherTool).toBe(before.otherTool);
}

// Percent change uses the current value as the denominator; compute from the
// independently derived SI quantities above, never from a rendered answer.
function percent(q) { return (q.after - q.before) / q.before * 100; }
function percentCard(s) { return nodes(s.prediction()).find(n => n.props?.['data-ml-power-prediction-percent'] !== undefined); }
function percentComparison(s, q) {
  comparison(s, q); const card = percentCard(s); expect(card).toBeTruthy();
  close(Number(card.props['data-value']), percent(q));
  expect(nodes(card).filter(n => n.props?.['data-ml-power-prediction-percent-equation'] !== undefined)).toHaveLength(1);
  expect(text(card)).toContain('%'); expect(text(card)).not.toMatch(/NaN|Infinity|undefined/);
  expect(text(card).toLowerCase()).toMatch(q.after > q.before ? /increase/ : q.after < q.before ? /decrease/ : /unchanged|no change|same/);
}
function noPercent(s) { expect(percentCard(s)).toBeUndefined(); }
function target(s, value) { s.edit('prediction-target', value); }

describe('Machine Lab: prediction percent arithmetic', () => {
  it.each(BENCHES)('checks all four $id percent changes independently', b => {
    const s = session(b), before = s.allState();
    for (const kind of KINDS) solve(s, kind, expected(b, kind));
    onlyPredictionChanged(before, s.allState()); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(BENCHES)('reverses the $id boundary scenarios without changing the denominator', b => {
    const settings = { ...BASE, [b.load]: b.max, loadDistance: 0.7 }, s = session(b, settings);
    s.edit('duration', 3600); s.edit('percent', 37.5);
    for (const kind of KINDS) solve(s, kind, expected(b, kind, { settings, seconds: 3600, percent: 37.5 }));
  });
  it('accepts both inclusive percentage-point boundaries around negative, positive and zero changes', () => {
    const s = session();
    for (const kind of ['time', 'load', 'work']) {
      const q = expected(BENCHES[0], kind); begin(s, kind);
      for (const offset of [-0.1, 0.1, -0.100001, 0.100001]) {
        s.click('retry'); ratio(s, q); s.number(percent(q) + offset); s.click('check-number');
        expect(s.numericResult()).toBe(Math.abs(offset) === 0.1 ? 'correct' : 'incorrect');
        if (Math.abs(offset) === 0.1) percentComparison(s, q); else { noComparison(s); noPercent(s); }
      }
    }
  });
  it('uses signed decimals including explicit plus, zero and whitespace while rejecting unsupported forms', () => {
    const s = session();
    for (const [kind, value] of [['load', '+100.0'], ['time', ' -50.0 '], ['work', '0'], ['work', '-0'], ['work', '+0.0']]) {
      begin(s, kind); s.click('retry'); const q = expected(BENCHES[0], kind); ratio(s, q); s.number(value); s.click('check-number');
      expect(s.numericResult(), value).toBe('correct'); percentComparison(s, q);
    }
    for (const value of ['', '   ', 'NaN', 'Infinity', '-Infinity', '50%', '-50 %', '1e2', '-5e1', '1,000', '--50', '+-50', '.', '+', '0x64']) {
      s.click('retry'); ratio(s, expected(BENCHES[0], 'work')); s.number(value); s.click('check-number');
      expect(s.numericResult(), value).toBe('invalid'); noComparison(s); noPercent(s);
    }
  });
  it('converts minutes once and computes unchanged work independently of power', () => {
    const s = session(BENCHES[5]); s.edit('duration', 2); s.edit('timeUnit', 'min');
    for (const kind of KINDS) solve(s, kind, expected(BENCHES[5], kind, { seconds: 120 }));
    expect(s.id('duration').props.value).toBe('2'); expect(s.id('timeUnit').props.value).toBe('min');
  });
  it('preserves the positive-value grading contract and its relative tolerance after switching back', () => {
    const s = session(); begin(s, 'time'); target(s, 'value');
    for (const [value, result] of [['0', 'invalid'], ['-25', 'invalid'], ['24.75', 'correct'], ['25.25', 'correct'], ['24.74999', 'incorrect'], ['25.25001', 'incorrect']]) {
      s.click('retry'); ratio(s, expected(BENCHES[0], 'time')); s.number(value); s.click('check-number'); expect(s.numericResult(), value).toBe(result); noPercent(s);
    }
  });
});

describe('Machine Lab: prediction percent lifecycle', () => {
  it('hides the optional target selector and works either numeric-first or ratio-first without premature disclosure', () => {
    const s = session(), q = expected(BENCHES[0], 'time');
    expect(s.id('prediction-target')).toBeUndefined(); noPercent(s); begin(s, 'time');
    s.number(-50); s.click('check-number'); expect(s.numericResult()).toBe('correct'); noComparison(s); noPercent(s);
    ratio(s, q); percentComparison(s, q); s.click('retry'); ratio(s, q); noComparison(s); noPercent(s);
    s.number(-50); s.click('check-number'); percentComparison(s, q);
  });
  it('clears pending drafts on target switches and treats a same-target selection as a no-op', () => {
    const s = session(); begin(s, 'time'); s.number(-50); s.click('check-number');
    const before = s.allState(); target(s, 'percent'); expect(s.allState()).toBe(before);
    target(s, 'value'); expect(s.id('prediction-number').props.value).toBe(''); expect(s.numericResult()).toBeUndefined(); noComparison(s); noPercent(s);
    s.number(25); s.click('check-number'); target(s, 'percent'); expect(s.id('prediction-number').props.value).toBe(''); expect(s.numericResult()).toBeUndefined();
  });
  it('preserves viewed provenance when switching from an exposed numeric value to percentage work', () => {
    const s = session(); s.mode(true); ratio(s, expected(BENCHES[0], 'time')); s.number(25); s.click('check-number'); comparison(s, expected(BENCHES[0], 'time'));
    target(s, 'percent'); expect(s.id('prediction-number').props.value).toBe(''); expect(s.numericResult()).toBe('solution'); percentComparison(s, expected(BENCHES[0], 'time'));
    s.number(-50); s.click('check-number'); expect(s.numericResult()).toBe('solution');
    s.click('retry'); ratio(s, expected(BENCHES[0], 'time')); s.number(-50); s.click('check-number'); expect(s.numericResult()).toBe('correct');
  });
  it('preserves explicit reveal provenance through target edits and calculation-mode toggles', () => {
    const s = session(); begin(s, 'time'); s.click('reveal'); expect(s.numericResult()).toBe('solution');
    target(s, 'value'); s.number(999); s.click('check-number'); expect(s.numericResult()).toBe('solution'); noPercent(s);
    target(s, 'percent'); s.number(99); s.click('check-number'); expect(s.numericResult()).toBe('solution'); percentComparison(s, expected(BENCHES[0], 'time'));
    s.mode(false); expect(s.id('prediction-target')).toBeUndefined(); noPercent(s); s.mode(true); expect(s.id('prediction-target').props.value).toBe('percent'); expect(s.numericResult()).toBe('solution');
  });
  it('retains the percent target on retry, next and kind changes while clearing answers and provenance', () => {
    const s = session(); begin(s, 'time');
    for (const reset of [() => s.click('retry'), () => s.click('next'), () => s.kind('work')]) {
      s.number(999); s.click('reveal'); reset(); expect(s.id('prediction-target').props.value).toBe('percent');
      expect(s.id('prediction-number').props.value).toBe(''); expect(s.numericResult()).toBeUndefined(); expect(s.result()).toBeUndefined(); noComparison(s); noPercent(s);
    }
  });
  it('uses the latest percent draft with older same-target checks and Enter callbacks', () => {
    const s = session(); begin(s, 'time'); ratio(s, expected(BENCHES[0], 'time')); const field = s.id('prediction-number'), check = s.action('check-number');
    s.number(-50); s.number(50); s.invoke(check); expect(s.numericResult()).toBe('incorrect'); noComparison(s);
    s.number(-50); const preventDefault = vi.fn(); field.props.onKeyDown({ key: 'Enter', isComposing: true, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled(); expect(s.numericResult()).toBeUndefined();
    field.props.onKeyDown({ key: 'Enter', preventDefault }); expect(preventDefault).toHaveBeenCalledOnce(); expect(s.numericResult()).toBe('correct');
  });
});

describe('Machine Lab: prediction percent isolation', () => {
  it('rejects stale numeric, Enter and target callbacks across both target switches', () => {
    const s = session(); s.mode(true);
    for (const next of ['percent', 'value']) {
      const field = s.id('prediction-number'), check = s.action('check-number'), selector = s.id('prediction-target'); target(s, next); const before = s.allState();
      field.props.onChange({ target: { value: '999' } }); field.props.onKeyDown({ key: 'Enter', preventDefault() {} }); s.invoke(check);
      selector.props.onChange({ target: { value: next === 'value' ? 'percent' : 'value' } }); expect(s.allState()).toBe(before);
      expect(s.id('prediction-number').props.value).toBe(''); expect(s.numericResult()).toBeUndefined();
    }
  });
  it('rejects target callbacks after disabling calculate, changing scenario, geometry or view', () => {
    for (const change of [s => s.mode(false), s => s.kind('work'), s => s.patch({ leverLoad: 600 }), s => s.patch({ bench: 'pulley' }), s => s.patch({ view: 'learn' })]) {
      const s = session(); begin(s, 'time'); const selector = s.id('prediction-target'); change(s); const before = s.allState();
      selector.props.onChange({ target: { value: 'value' } }); expect(s.allState()).toBe(before);
    }
  });
  it('clears malformed explicit restored target drafts but preserves a missing legacy target', () => {
    const s = session(); s.mode(true); s.number(25); s.click('check-number'); const raw = s.state().benchPowerPredictions.lever;
    for (const numericTarget of [null, {}, [], true, 1, 'other', 'Percent', '']) {
      s.patch({ benchPowerPredictions: { lever: { ...raw, numericTarget } } }); expect(s.id('prediction-target').props.value).toBe('value');
      expect(s.id('prediction-number').props.value).toBe(''); expect(s.numericResult()).toBeUndefined(); noComparison(s); noPercent(s);
    }
    const { numericTarget: omitted, ...legacy } = raw; s.patch({ benchPowerPredictions: { lever: legacy } });
    expect(s.id('prediction-target').props.value).toBe('value'); expect(s.id('prediction-number').props.value).toBe('25'); expect(s.numericResult()).toBe('correct');
  });
  it('keeps independent target and numeric drafts per bench without writes during rendering', () => {
    const s = session(); begin(s, 'time'); s.number(-50); s.click('check-number'); const lever = s.state().benchPowerPredictions.lever;
    s.patch({ bench: 'screw' }); s.mode(true); expect(s.id('prediction-target').props.value).toBe('value'); s.number(125); s.click('reveal');
    expect(s.state().benchPowerPredictions.lever).toBe(lever); s.patch({ bench: 'lever' });
    expect(s.id('prediction-target').props.value).toBe('percent'); expect(s.id('prediction-number').props.value).toBe('-50'); expect(s.numericResult()).toBe('correct');
    const before = s.allState(); s.render(); expect(s.allState()).toBe(before);
  });
  it('keeps saved records, main calculation drafts, reflection and XP untouched', () => {
    const s = session(BENCHES[4], { designReflection: 'Keep reflection', benchPower: { screw: { answer: 'Keep draft' } } });
    s.edit('answer', 50); s.edit('unit', 'W'); s.calculationClick('check'); s.calculationClick('save');
    const before = s.allState(), records = s.state().benchPowerRecords, drafts = s.state().benchPower;
    expect(records.windlass.inputPower).toBeTruthy(); for (const kind of KINDS) solve(s, kind, expected(BENCHES[4], kind));
    onlyPredictionChanged(before, s.allState()); expect(s.state().benchPowerRecords).toBe(records); expect(s.state().benchPower).toBe(drafts);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('labels target and signed input, exposes percent units and announces checked feedback', () => {
    const s = session(); begin(s, 'time'); const selector = s.id('prediction-target'), field = s.id('prediction-number'), all = nodes(s.prediction());
    expect(selector.type).toBe('select'); expect(selector.props['data-ml-power-prediction-target']).not.toBeUndefined();
    expect(field.props).toMatchObject({ type: 'text', inputMode: 'text', maxLength: 64 });
    for (const control of [selector, field]) expect(all.some(n => n.type === 'label' && (n.props.htmlFor === control.props.id || nodes(n).includes(control)))).toBe(true);
    expect(text(all.find(n => n.type === 'label' && n.props.htmlFor === field.props.id))).toContain('%');
    s.click('check-number'); const feedback = nodes(s.prediction()).find(n => n.props?.['data-ml-power-prediction-number-result']);
    expect(nodes(s.prediction()).some(n => (n.props?.role === 'status' || n.props?.['aria-live']) && nodes(n).includes(feedback))).toBe(true);
  });
});
