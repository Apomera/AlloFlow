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
const CHOICES = ['half', 'same', 'double'];
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
  const invoke = n => { expect(n).toBeTruthy(); n.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  const choose = kind => { const n = choice(kind); expect(n).toBeTruthy(); n.props.onChange({ target: { value: kind, checked: true } }); };
  const edit = (suffix, value) => { const n = id(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); };
  return { b, render, find, id, prediction, action, choice, invoke, choose, edit, awardXP, tryAward,
    state: () => store.toolData.machineLab, allState: () => store.toolData,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    click: kind => invoke(action(kind)), kind: kind => edit('prediction-kind', kind),
    result: () => nodes(prediction()).find(n => n.props?.['data-ml-power-prediction-result'])?.props['data-ml-power-prediction-result'],
    calculationClick: kind => invoke(find(n => n.type === 'button' && n.props?.[`data-ml-power-${kind}`] !== undefined)) };
}
// Independent SI identities. Never use the implementation's model, expected answer,
// displayed values, saved source strings, or its private scenario helper as an oracle.
function expected(b, kind, { settings = BASE, seconds = 5, percent = 80 } = {}) {
  const load = settings[b.load], movement = settings.loadDistance, eta = percent / 100;
  const energy = load * movement / eta;
  const old = kind === 'efficiency' ? percent : kind === 'load' ? load : seconds;
  const limit = kind === 'efficiency' ? 100 : kind === 'load' ? b.max : 3600;
  const factor = old * 2 <= limit ? 2 : 0.5;
  const before = kind === 'work' ? energy : energy / seconds;
  const after = kind === 'work' ? energy : kind === 'load' ? before * factor : before / factor;
  const answer = after === before ? 'same' : after < before ? 'half' : 'double';
  return { before, after, unit: kind === 'work' ? 'J' : 'W', inputUnit: kind === 'efficiency' ? '%' : kind === 'load' ? 'N' : 's', answer, factor, old, changed: old * factor };
}
function close(actual, wanted) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(Math.max(1e-12, Math.abs(wanted) * 1e-11));
}
function noComparison(s) {
  expect(nodes(s.prediction()).filter(n => n.props?.['data-ml-power-prediction-metric'])).toHaveLength(0);
  expect(nodes(s.prediction()).filter(n => n.props?.['data-ml-power-prediction-bar'])).toHaveLength(0);
  expect(nodes(s.prediction()).filter(n => n.props?.['data-ml-power-prediction-equation'] !== undefined)).toHaveLength(0);
}
function comparison(s, want, result = 'correct') {
  expect(s.result()).toBe(result);
  const all = nodes(s.prediction()), metrics = all.filter(n => n.props?.['data-ml-power-prediction-metric']);
  expect(metrics.map(n => n.props['data-ml-power-prediction-metric']).sort()).toEqual(['after', 'before']);
  for (const name of ['before', 'after']) {
    const metric = metrics.find(n => n.props['data-ml-power-prediction-metric'] === name);
    expect(metric.props['data-unit']).toBe(want.unit); close(Number(metric.props['data-value']), want[name]);
    expect(metric.props.children.map(n => n.type)).toEqual(['dt', 'dd']);
  }
  const bars = all.filter(n => n.props?.['data-ml-power-prediction-bar']);
  expect(bars.map(n => n.props['data-ml-power-prediction-bar']).sort()).toEqual(['after', 'before']);
  for (const bar of bars) {
    const value = want[bar.props['data-ml-power-prediction-bar']];
    close(Number.parseFloat(bar.props.style.width), value / Math.max(want.before, want.after) * 100);
    expect([undefined, 0, '0', '0px']).toContain(bar.props.style.minWidth);
    expect(all.some(n => String(n.props?.['aria-hidden']) === 'true' && nodes(n).includes(bar))).toBe(true);
  }
  expect(text(s.prediction())).not.toMatch(/NaN|Infinity|undefined/);
  expect(all.filter(n => n.props?.['data-ml-power-prediction-equation'] !== undefined)).toHaveLength(1);
  expect(all.filter(n => n.props?.role === 'status' || n.props?.['aria-live']).some(n => metrics.some(metric => nodes(n).includes(metric)))).toBe(false);
}
function solve(s, kind, want, result = 'correct') {
  s.kind(kind); noComparison(s);
  const inputs = nodes(s.prediction()).filter(n => n.props?.['data-ml-power-prediction-input']);
  expect(inputs.map(n => n.props['data-ml-power-prediction-input']).sort()).toEqual(['after', 'before']);
  for (const [key, value] of [['before', want.old], ['after', want.changed]]) {
    const input = inputs.find(n => n.props['data-ml-power-prediction-input'] === key);
    expect(input.props['data-unit']).toBe(want.inputUnit); close(Number(input.props['data-value']), value);
  }
  if (result === 'solution') s.click('reveal'); else { s.choose(want.answer); s.click('check'); }
  comparison(s, want, result);
}
function onlyPredictionChanged(before, after) {
  const { benchPowerPredictions: _before, ...oldState } = before.machineLab;
  const { benchPowerPredictions: _after, ...newState } = after.machineLab;
  expect(newState).toEqual(oldState); expect(after.otherTool).toBe(before.otherTool);
}

describe('Machine Lab: prediction arithmetic', () => {
  it.each(BENCHES)('checks all four $id relationships using independent work and power identities', b => {
    const s = session(b), before = s.allState();
    expect(nodes(s.id('prediction-kind')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual(KINDS);
    for (const kind of KINDS) solve(s, kind, expected(b, kind));
    onlyPredictionChanged(before, s.allState());
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(BENCHES)('reverses the $id load change at its exact bounds without editing the task', b => {
    const s = session(b);
    for (const load of [b.min, b.max / 2, b.max / 2 + 1, b.max]) {
      const settings = { ...BASE, [b.load]: load }; s.patch({ [b.load]: load });
      const before = s.allState(); solve(s, 'load', expected(b, 'load', { settings }));
      onlyPredictionChanged(before, s.allState()); expect(s.state()[b.load]).toBe(load);
    }
  });
  it('normalizes minutes exactly once for both time-dependent power and time-independent work', () => {
    const b = BENCHES[4], s = session(b);
    s.edit('duration', 2); s.edit('timeUnit', 'min');
    for (const kind of KINDS) solve(s, kind, expected(b, kind, { seconds: 120 }));
    expect(s.id('duration').props.value).toBe('2'); expect(s.id('timeUnit').props.value).toBe('min');
  });
  it('chooses only admissible duration changes at both limits and the doubling boundary', () => {
    const b = BENCHES[0], s = session(b);
    for (const seconds of [0.01, 1800, 1800.01, 3600]) {
      s.edit('duration', seconds);
      for (const kind of ['time', 'work']) solve(s, kind, expected(b, kind, { seconds }));
      expect(s.id('duration').props.value).toBe(String(seconds));
    }
  });
  it('uses percentage fractions and reverses efficiency changes before exceeding 100 percent', () => {
    const b = BENCHES[5], s = session(b);
    for (const percent of [1, 37.5, 50, 50.01, 100]) {
      s.edit('percent', percent); solve(s, 'efficiency', expected(b, 'efficiency', { percent }));
      expect(s.id('percent').props.value).toBe(String(percent));
    }
  });
  it('uses vertical movement for a ramp and keeps power independent of rotary geometry', () => {
    for (const b of [BENCHES[2], BENCHES[4], BENCHES[5]]) {
      const settings = { ...BASE, loadDistance: 0.7, rampLength: 7, rampHeight: 0.5, windlassHandleR: 0.6, windlassDrumR: 0.15, screwHandleR: 0.2, screwPitch: 0.012 };
      const s = session(b, settings); s.edit('percent', 37.5); s.edit('duration', 12.5);
      for (const kind of KINDS) solve(s, kind, expected(b, kind, { settings, percent: 37.5, seconds: 12.5 }));
    }
  });
});

describe('Machine Lab: prediction lifecycle', () => {
  it('requires a choice and withholds the numeric comparison after a wrong prediction', () => {
    const s = session(); noComparison(s); s.click('check'); expect(s.result()).toBe('invalid'); noComparison(s);
    s.choose('same'); expect(s.result()).toBeUndefined(); s.click('check'); expect(s.result()).toBe('incorrect'); noComparison(s);
    expect(text(s.prediction())).toMatch(/time|duration/i);
    s.choose('half'); expect(s.result()).toBeUndefined(); noComparison(s); s.click('check'); comparison(s, expected(BENCHES[0], 'time'));
  });
  it('checks the latest choice when a previous render supplied the check handler', () => {
    const s = session(), oldCheck = s.action('check');
    s.choose('same'); s.choose('half'); s.invoke(oldCheck); comparison(s, expected(BENCHES[0], 'time'));
    s.choose('double'); expect(s.result()).toBeUndefined(); noComparison(s); s.invoke(oldCheck); expect(s.result()).toBe('incorrect'); noComparison(s);
  });
  it('honestly retains solution provenance across checking and choice edits until retry', () => {
    const s = session(), want = expected(BENCHES[0], 'time');
    s.click('reveal'); comparison(s, want, 'solution');
    for (const choice of CHOICES) { s.choose(choice); s.click('check'); comparison(s, want, 'solution'); }
    s.click('retry'); expect(s.result()).toBeUndefined(); noComparison(s);
    expect(CHOICES.filter(c => s.choice(c).props.checked)).toEqual([]);
    s.choose('half'); s.click('check'); comparison(s, want);
  });
  it('clears feedback and choices when changing scenarios or cycling to the next one', () => {
    const s = session();
    for (const [index, kind] of KINDS.entries()) {
      expect(s.id('prediction-kind').props.value).toBe(kind);
      s.click('reveal'); expect(s.result()).toBe('solution'); s.click('next');
      expect(s.id('prediction-kind').props.value).toBe(KINDS[(index + 1) % KINDS.length]);
      expect(s.result()).toBeUndefined(); noComparison(s); expect(CHOICES.filter(c => s.choice(c).props.checked)).toEqual([]);
    }
    s.choose('half'); s.click('check'); s.kind('work');
    expect(s.result()).toBeUndefined(); noComparison(s); expect(CHOICES.filter(c => s.choice(c).props.checked)).toEqual([]);
  });
  it('rejects handlers from a scenario that has already been replaced', () => {
    const s = session(); s.choose('half');
    const old = ['check', 'reveal', 'next', 'retry'].map(kind => s.action(kind)), oldChoice = s.choice('double'), oldSelect = s.id('prediction-kind');
    s.kind('work'); const before = s.allState();
    for (const handler of old) s.invoke(handler);
    oldChoice.props.onChange({ target: { value: 'double', checked: true } });
    oldSelect.props.onChange({ target: { value: 'efficiency' } });
    expect(s.allState()).toBe(before); expect(s.id('prediction-kind').props.value).toBe('work'); noComparison(s);
  });
  it('invalidates prior results and delayed handlers after setup, calculation or navigation changes', () => {
    const changes = [s => s.patch({ leverLoad: 500 }), s => s.patch({ leverEffortArm: 3 }), s => s.patch({ loadDistance: 0.6 }),
      s => s.edit('percent', 40), s => s.edit('duration', 10), s => s.edit('timeUnit', 'min'), s => s.edit('budget', 200),
      s => s.edit('question', 'handSpeed'), s => s.patch({ bench: 'pulley' }), s => s.patch({ view: 'launchers' })];
    for (const change of changes) {
      const s = session(); s.click('reveal'); const old = ['check', 'reveal', 'next', 'retry'].map(kind => s.action(kind));
      const oldChoice = s.choice('same'), oldSelect = s.id('prediction-kind'); change(s); const before = s.allState();
      for (const handler of old) s.invoke(handler);
      oldChoice.props.onChange({ target: { value: 'same', checked: true } }); oldSelect.props.onChange({ target: { value: 'load' } });
      expect(s.allState()).toBe(before); expect(s.result()).toBeUndefined(); noComparison(s);
    }
  });
});

describe('Machine Lab: prediction isolation and structure', () => {
  it('does not alter saved v1-v5 calculations, work in other benches, reflection or XP', () => {
    const b = BENCHES[4], otherDraft = { question: 'turns', answer: 'keep' };
    const s = session(b, { benchPower: { screw: otherDraft }, designReflection: 'Keep reflection' });
    const cases = [
      ['inputPower', 50, 'W', 1], ['budgetEnergy', 500, 'J', 2],
      ['turns', 0.5 / (2 * Math.PI * 0.1), 'turns', 3], ['effortFromPower', 400 / (0.45 / 0.1) / 0.8, 'N', 4],
      ['powerKilowatts', 0.05, 'kW', 5]
    ];
    for (const [kind, answer, unit, version] of cases) {
      s.edit('question', kind); s.edit('answer', answer); s.edit('unit', unit); s.calculationClick('check'); s.calculationClick('save');
      expect(s.state().benchPowerRecords.windlass[kind].version).toBe(version);
    }
    const before = s.allState(), records = before.machineLab.benchPowerRecords, draft = before.machineLab.benchPower;
    for (const kind of KINDS) { s.kind(kind); s.choose('same'); s.click('check'); s.click('reveal'); s.click('retry'); s.click('next'); }
    onlyPredictionChanged(before, s.allState()); expect(s.state().benchPowerRecords).toBe(records); expect(s.state().benchPower).toBe(draft);
    expect(s.state().benchPower.screw).toBe(otherDraft); expect(s.state().designReflection).toBe('Keep reflection');
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('stores independent progress per bench and renders without writing state', () => {
    const s = session(), start = s.allState(); s.render(); expect(s.allState()).toBe(start); expect(s.state().benchPowerPredictions).toBeUndefined();
    s.kind('work'); s.choose('same'); s.click('check'); comparison(s, expected(BENCHES[0], 'work'));
    const lever = s.state().benchPowerPredictions.lever; s.patch({ bench: 'screw' });
    expect(s.result()).toBeUndefined(); s.kind('load'); s.click('reveal'); comparison(s, expected(BENCHES[5], 'load'), 'solution');
    expect(s.state().benchPowerPredictions.lever).toBe(lever); s.patch({ bench: 'lever' }); comparison(s, expected(BENCHES[0], 'work'));
    const before = s.allState(); s.render(); expect(s.allState()).toBe(before);
  });
  it('uses native disclosure, labeled radio choices and a single fieldset legend', () => {
    const s = session(), detail = s.prediction(), all = nodes(detail);
    expect(detail?.type).toBe('details'); expect(detail.props.open).not.toBe(true);
    expect(detail.props.children[0].type).toBe('summary'); expect(text(detail.props.children[0])).toMatch(/predict/i);
    const fieldsets = all.filter(n => n.type === 'fieldset'); expect(fieldsets).toHaveLength(1);
    expect(nodes(fieldsets[0]).filter(n => n.type === 'legend')).toHaveLength(1);
    const radios = all.filter(n => n.type === 'input' && n.props.type === 'radio'); expect(radios).toHaveLength(3);
    expect(radios.map(n => n.props['data-ml-power-prediction-choice'])).toEqual(CHOICES);
    expect(new Set(radios.map(n => n.props.name)).size).toBe(1); expect(radios.every(n => n.props.name)).toBe(true);
    for (const radio of radios) expect(all.some(n => n.type === 'label' && (radio.props.id && n.props.htmlFor === radio.props.id || nodes(n).includes(radio)))).toBe(true);
    expect(all.some(n => n.type === 'label' && n.props.htmlFor === s.id('prediction-kind').props.id)).toBe(true);
    expect(all.filter(n => n.type === 'button').every(n => n.props.type === 'button')).toBe(true);
  });
  it('keeps the existing age and valid-model gates', () => {
    for (const bandOverride of ['k2', 'g35']) expect(session(BENCHES[0], { bandOverride }).prediction()).toBeUndefined();
    for (const patch of [{ leverEffortArm: 0 }, { leverLoad: 0 }, { loadDistance: 0 }, { benchPower: { lever: { percent: '0' } } },
      { benchPower: { lever: { duration: '0' } } }, { benchPower: { lever: { budget: '0' } } }]) expect(session(BENCHES[0], patch).prediction()).toBeUndefined();
    for (const bandOverride of ['g68', 'g912']) expect(session(BENCHES[0], { bandOverride }).prediction()).toBeTruthy();
  });
  it('treats malformed stored prediction choices as unanswered without granting completion', () => {
    const s = session(); s.choose('half'); s.click('check'); const raw = s.state().benchPowerPredictions.lever;
    for (const choice of ['', 'HALF', 'same ', null, {}, 2]) {
      s.patch({ benchPowerPredictions: { lever: { ...raw, choice, checked: true, revealed: false } } });
      noComparison(s); s.click('check'); expect(s.result()).toBe('invalid'); noComparison(s);
    }
    expect(s.state().benchPowerRecords).toBeUndefined(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('ignores malformed maps and stale signatures without writing state during recovery', () => {
    const s = session(); s.kind('work'); s.click('reveal'); const raw = s.state().benchPowerPredictions.lever;
    for (const entries of [null, [], 'wrong', { lever: [] }, { lever: 42 }, { lever: { ...raw, signature: 'old setup' } }]) {
      s.patch({ benchPowerPredictions: entries }); const before = s.allState();
      expect(s.prediction()).toBeTruthy(); expect(s.result()).toBeUndefined(); noComparison(s);
      expect(CHOICES.filter(c => s.choice(c).props.checked)).toEqual([]); expect(s.allState()).toBe(before);
    }
  });
});
