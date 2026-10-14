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
  for (const suffix of ['metric', 'bar', 'equation']) expect(nodes(s.prediction()).filter(n => n.props?.[`data-ml-power-prediction-${suffix}`] !== undefined)).toHaveLength(0);
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
function begin(s, kind) { s.kind(kind); s.mode(true); expect(s.id('prediction-number').props.value).toBe(''); noComparison(s); }
function solve(s, kind, want) {
  begin(s, kind); ratio(s, want); noComparison(s); s.number(want.after); s.click('check-number');
  expect(s.numericResult()).toBe('correct'); comparison(s, want);
}
function onlyPredictionChanged(before, after) {
  const { benchPowerPredictions: _old, ...oldState } = before.machineLab;
  const { benchPowerPredictions: _new, ...newState } = after.machineLab;
  expect(newState).toEqual(oldState); expect(after.otherTool).toBe(before.otherTool);
}

describe('Machine Lab: prediction calculation arithmetic', () => {
  it.each(BENCHES)('solves all four $id values and both relative tolerance boundaries independently', b => {
    const s = session(b), before = s.allState();
    for (const kind of KINDS) {
      const want = expected(b, kind); solve(s, kind, want);
      for (const factor of [0.99, 1.01, 0.98999999, 1.01000001]) {
        s.click('retry'); ratio(s, want); s.number(want.after * factor); s.click('check-number');
        if (factor === 0.99 || factor === 1.01) { expect(s.numericResult()).toBe('correct'); comparison(s, want); }
        else { expect(s.numericResult()).toBe('incorrect'); noComparison(s); }
      }
    }
    onlyPredictionChanged(before, s.allState()); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('converts minutes exactly once and checks unchanged work separately from average power', () => {
    const b = BENCHES[4], s = session(b); s.edit('duration', 2); s.edit('timeUnit', 'min');
    for (const kind of KINDS) solve(s, kind, expected(b, kind, { seconds: 120 }));
    expect(s.id('duration').props.value).toBe('2'); expect(s.id('timeUnit').props.value).toBe('min');
  });
  it('uses full precision for nondefault ramp and rotary geometry at boundary assumptions', () => {
    for (const b of [BENCHES[2], BENCHES[4], BENCHES[5]]) {
      const settings = { ...BASE, [b.load]: b.max, loadDistance: 0.7, rampLength: 7, rampHeight: 0.5,
        windlassHandleR: 0.6, windlassDrumR: 0.15, screwHandleR: 0.2, screwPitch: 0.012 };
      const s = session(b, settings); s.edit('percent', 37.5); s.edit('duration', 3600);
      for (const kind of KINDS) solve(s, kind, expected(b, kind, { settings, percent: 37.5, seconds: 3600 }));
    }
  });
  it('keeps relative tolerance meaningful at the smallest valid power and largest valid work', () => {
    const smallSettings = { ...BASE, leverLoad: 10, loadDistance: 0.1 }, small = session(BENCHES[0], smallSettings);
    small.edit('percent', 100); small.edit('duration', 1800); begin(small, 'time');
    const q = expected(BENCHES[0], 'time', { settings: smallSettings, percent: 100, seconds: 1800 });
    for (const [value, outcome] of [[q.after, 'correct'], [q.after * 1.02, 'incorrect'], [0, 'invalid']]) {
      small.click('retry'); ratio(small, q); small.number(value); small.click('check-number'); expect(small.numericResult()).toBe(outcome);
    }
    const largeSettings = { ...BASE, screwLoad: 5000, loadDistance: 3 }, large = session(BENCHES[5], largeSettings);
    large.edit('percent', 1); large.edit('duration', 0.01); solve(large, 'work', expected(BENCHES[5], 'work', { settings: largeSettings, percent: 1, seconds: 0.01 }));
  });
});

describe('Machine Lab: prediction calculation lifecycle', () => {
  it('starts optional and withholds calculations until both answers are independently checked', () => {
    const s = session(), q = expected(BENCHES[0], 'time');
    expect(s.toggle().props.checked).toBe(false); expect(s.id('prediction-number')).toBeUndefined();
    s.mode(true); s.number(q.after); s.click('check-number'); expect(s.numericResult()).toBe('correct'); expect(s.result()).toBeUndefined(); noComparison(s);
    s.choose('same'); s.click('check'); expect(s.result()).toBe('incorrect'); expect(s.numericResult()).toBe('correct'); noComparison(s);
    ratio(s, q); expect(s.numericResult()).toBe('correct'); comparison(s, q);
  });
  it('checks the ratio first without revealing the numeric target in calculation mode', () => {
    const s = session(), q = expected(BENCHES[0], 'time'); s.mode(true); ratio(s, q);
    expect(s.numericResult()).toBeUndefined(); expect(text(s.prediction())).toMatch(/calculat/i); noComparison(s);
    s.click('check-number'); expect(s.numericResult()).toBe('invalid'); noComparison(s);
    s.number(q.after * 2); s.click('check-number'); expect(s.numericResult()).toBe('incorrect'); noComparison(s);
    s.number(q.after); expect(s.numericResult()).toBeUndefined(); s.click('check-number'); expect(s.numericResult()).toBe('correct'); comparison(s, q);
  });
  it('rejects blank, nonfinite, nonpositive and unsupported numeric forms', () => {
    const s = session(); s.mode(true); ratio(s, expected(BENCHES[0], 'time'));
    for (const value of ['', '   ', 'NaN', 'Infinity', '-Infinity', '0', '-0', '-1', '25 W', '2.5e1', '1,000']) {
      s.number(value); s.click('check-number'); expect(s.numericResult(), value).toBe('invalid'); noComparison(s);
    }
    s.number(' 25.0 '); s.click('check-number'); expect(s.numericResult()).toBe('correct');
  });
  it('uses the latest numeric draft and latest ratio choice with earlier check callbacks', () => {
    const s = session(); s.mode(true); const oldRatioCheck = s.action('check'), oldNumberCheck = s.action('check-number');
    s.number(25); s.number(999); s.invoke(oldNumberCheck); expect(s.numericResult()).toBe('incorrect'); noComparison(s);
    s.number(999); s.number(25); s.choose('same'); s.choose('half'); s.invoke(oldNumberCheck); s.invoke(oldRatioCheck);
    expect(s.numericResult()).toBe('correct'); comparison(s, expected(BENCHES[0], 'time'));
  });
  it('supports Enter on the numeric field using the latest number and leaves other keys unchanged', () => {
    const s = session(); s.mode(true); ratio(s, expected(BENCHES[0], 'time'));
    const field = s.id('prediction-number'), preventDefault = vi.fn(); s.number(25);
    field.props.onKeyDown({ key: 'Escape', preventDefault }); expect(s.numericResult()).toBeUndefined(); expect(preventDefault).not.toHaveBeenCalled();
    field.props.onKeyDown({ key: 'Enter', isComposing: true, preventDefault }); expect(s.numericResult()).toBeUndefined(); expect(preventDefault).not.toHaveBeenCalled();
    field.props.onKeyDown({ key: 'Enter', preventDefault }); expect(preventDefault).toHaveBeenCalledOnce(); expect(s.numericResult()).toBe('correct');
  });
  it('marks numerical answers as viewed when plain prediction checking already showed them', () => {
    const s = session(), q = expected(BENCHES[0], 'time'); ratio(s, q); comparison(s, q);
    s.mode(true); expect(s.numericResult()).toBe('solution'); comparison(s, q);
    s.number(q.after); s.click('check-number'); expect(s.numericResult()).toBe('solution');
    s.click('retry'); expect(s.numericResult()).toBeUndefined(); expect(s.id('prediction-number').props.value).toBe(''); noComparison(s);
    ratio(s, q); s.number(q.after); s.click('check-number'); expect(s.numericResult()).toBe('correct');
  });
  it('marks a pending numerical answer as viewed after disabling calculation mode exposes it', () => {
    const s = session(), q = expected(BENCHES[0], 'time'); s.mode(true); ratio(s, q); noComparison(s);
    expect(s.numericResult()).toBeUndefined(); s.mode(false); comparison(s, q);
    s.mode(true); expect(s.numericResult()).toBe('solution'); s.number(q.after); s.click('check-number'); expect(s.numericResult()).toBe('solution');
  });
  it('marks a legacy checked plain prediction as viewed when calculation mode is enabled', () => {
    const s = session(), q = expected(BENCHES[0], 'time'); ratio(s, q);
    const { calculate, numericAnswer, numericChecked, numericViewed, ...legacy } = s.state().benchPowerPredictions.lever;
    s.patch({ benchPowerPredictions: { lever: legacy } }); comparison(s, q); expect(s.toggle().props.checked).toBe(false);
    s.mode(true); expect(s.numericResult()).toBe('solution'); expect(s.id('prediction-number').props.value).toBe(''); comparison(s, q);
  });
  it('keeps explicitly viewed provenance through number edits, ratio edits and mode toggles', () => {
    const s = session(), q = expected(BENCHES[0], 'time'); s.mode(true); s.click('reveal');
    expect(s.numericResult()).toBe('solution'); expect(s.result()).toBe('solution'); comparison(s, q);
    for (const value of ['', 'invalid', '25', '999']) {
      s.number(value); s.choose('same'); s.click('check-number'); s.click('check');
      expect(s.numericResult()).toBe('solution'); expect(s.result()).toBe('solution'); comparison(s, q);
    }
    s.mode(false); s.mode(true); expect(s.numericResult()).toBe('solution'); comparison(s, q);
  });
  it('identifies an edited previously exposed value as viewed instead of a new independent answer', () => {
    const s = session(), q = expected(BENCHES[0], 'time'); solve(s, 'time', q);
    s.number('999'); expect(s.numericResult()).toBe('solution'); s.click('check-number'); expect(s.numericResult()).toBe('solution');
    s.choose('same'); s.click('check'); expect(s.result()).toBe('incorrect'); expect(s.numericResult()).toBe('solution');
    s.click('retry'); s.number(q.after); s.click('check-number'); expect(s.numericResult()).toBe('correct'); noComparison(s);
  });
  it('resets numeric work for a new scenario, next challenge and retry while retaining the chosen mode', () => {
    const s = session(); s.mode(true);
    for (const reset of [() => s.kind('efficiency'), () => s.click('next'), () => s.click('retry')]) {
      s.number(999); s.click('reveal'); expect(s.numericResult()).toBe('solution'); reset();
      expect(s.toggle().props.checked).toBe(true); expect(s.id('prediction-number').props.value).toBe('');
      expect(s.numericResult()).toBeUndefined(); expect(s.result()).toBeUndefined(); noComparison(s);
    }
  });
});

describe('Machine Lab: prediction calculation isolation', () => {
  it('rejects earlier numeric edit and check callbacks while calculation mode is disabled', () => {
    const s = session(); s.mode(true); const field = s.id('prediction-number'), check = s.action('check-number');
    s.mode(false); const before = s.allState(); field.props.onChange({ target: { value: '999' } });
    field.props.onKeyDown({ key: 'Enter', preventDefault() {} }); s.invoke(check); expect(s.allState()).toBe(before);
    s.mode(true); expect(s.id('prediction-number').props.value).toBe(''); expect(s.numericResult()).toBeUndefined();
  });
  it('rejects numeric callbacks from a replaced scenario or changed setup and navigation', () => {
    const changes = [s => s.kind('work'), s => s.patch({ leverLoad: 500 }), s => s.patch({ leverEffortArm: 3 }),
      s => s.patch({ loadDistance: 0.6 }), s => s.edit('percent', 40), s => s.edit('duration', 10), s => s.edit('timeUnit', 'min'),
      s => s.edit('budget', 200), s => s.edit('question', 'handSpeed'), s => s.patch({ bench: 'pulley' }), s => s.patch({ view: 'learn' })];
    for (const change of changes) {
      const s = session(); s.mode(true); s.number(25); const oldCheck = s.action('check-number'), oldField = s.id('prediction-number'), oldToggle = s.toggle();
      change(s); const before = s.allState(); s.invoke(oldCheck);
      oldField.props.onChange({ target: { value: '999' } }); oldField.props.onKeyDown({ key: 'Enter', preventDefault() {} });
      oldToggle.props.onChange({ target: { checked: false } }); expect(s.allState()).toBe(before);
      expect(s.numericResult()).toBeUndefined(); noComparison(s);
    }
  });
  it('clears signature-bound numeric drafts and does not revive checked answers after a task edit', () => {
    const s = session(); s.mode(true); s.number(25); s.click('check-number'); s.patch({ leverLoad: 600 });
    expect(s.numericResult()).toBeUndefined(); s.mode(true); expect(s.id('prediction-number').props.value).toBe(''); noComparison(s);
    const before = s.allState(); s.render(); expect(s.allState()).toBe(before);
  });
  it('preserves saved v1-v5 calculation records, other drafts, reflection and XP', () => {
    const b = BENCHES[4], other = { question: 'turns', answer: 'Keep this draft' };
    const s = session(b, { benchPower: { screw: other }, designReflection: 'Keep reflection' });
    for (const [kind, answer, unit, version] of [['inputPower', 50, 'W', 1], ['budgetEnergy', 500, 'J', 2],
      ['turns', 0.5 / (2 * Math.PI * 0.1), 'turns', 3], ['effortFromPower', 400 / 4.5 / 0.8, 'N', 4], ['powerKilowatts', 0.05, 'kW', 5]]) {
      s.edit('question', kind); s.edit('answer', answer); s.edit('unit', unit); s.calculationClick('check'); s.calculationClick('save');
      expect(s.state().benchPowerRecords.windlass[kind].version).toBe(version);
    }
    const before = s.allState(), records = s.state().benchPowerRecords, drafts = s.state().benchPower;
    for (const kind of KINDS) { solve(s, kind, expected(b, kind)); s.click('reveal'); s.click('retry'); }
    onlyPredictionChanged(before, s.allState()); expect(s.state().benchPowerRecords).toBe(records); expect(s.state().benchPower).toBe(drafts);
    expect(s.state().benchPower.screw).toBe(other); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('keeps independent numeric progress per bench and avoids state writes during rendering', () => {
    const s = session(); s.mode(true); s.number(25); s.click('check-number'); const lever = s.state().benchPowerPredictions.lever;
    s.patch({ bench: 'screw' }); expect(s.toggle().props.checked).toBe(false); s.mode(true); s.number(125); s.click('reveal');
    expect(s.state().benchPowerPredictions.lever).toBe(lever); s.patch({ bench: 'lever' }); expect(s.id('prediction-number').props.value).toBe('25');
    expect(s.numericResult()).toBe('correct'); expect(s.result()).toBeUndefined(); noComparison(s);
    const before = s.allState(); s.render(); expect(s.allState()).toBe(before);
  });
  it('labels the numeric field and checkbox and exposes fixed units with live numeric feedback', () => {
    const s = session(); s.mode(true);
    for (const kind of KINDS) {
      s.kind(kind); const all = nodes(s.prediction()), field = s.id('prediction-number'), toggle = s.toggle();
      expect(toggle.props.type).toBe('checkbox'); expect(field.props).toMatchObject({ type: 'text', inputMode: 'decimal', maxLength: 64 });
      expect(all.some(n => n.type === 'label' && (n.props.htmlFor === field.props.id || nodes(n).includes(field)))).toBe(true);
      expect(all.some(n => n.type === 'label' && (toggle.props.id && n.props.htmlFor === toggle.props.id || nodes(n).includes(toggle)))).toBe(true);
      const label = all.find(n => n.type === 'label' && n.props.htmlFor === field.props.id); expect(text(label)).toContain(kind === 'work' ? 'J' : 'W');
      s.click('check-number'); const result = nodes(s.prediction()).find(n => n.props?.['data-ml-power-prediction-number-result']);
      expect(nodes(s.prediction()).some(n => (n.props?.role === 'status' || n.props?.['aria-live']) && nodes(n).includes(result))).toBe(true);
    }
  });
  it('handles malformed restored numeric flags and drafts without assigning an independent success', () => {
    const s = session(); s.mode(true); const raw = s.state().benchPowerPredictions.lever;
    for (const numericAnswer of [null, {}, [], 25, true]) {
      s.patch({ benchPowerPredictions: { lever: { ...raw, numericAnswer, numericChecked: true, numericViewed: false } } });
      expect(s.id('prediction-number').props.value).toBe(''); s.click('check-number'); expect(s.numericResult()).toBe('invalid'); noComparison(s);
    }
    s.patch({ benchPowerPredictions: { lever: { ...raw, numericAnswer: '25', numericChecked: 'true', numericViewed: 'true' } } });
    expect(s.numericResult()).toBeUndefined(); noComparison(s);
    s.number('1'.repeat(100)); expect(s.id('prediction-number').props.value).toHaveLength(64);
    expect(s.state().benchPowerRecords).toBeUndefined(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
});
