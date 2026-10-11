import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Fixtures and expected values are independent of the production physics helpers.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const QUESTIONS = [{ id: 'input', unit: 'J', metric: 'workIn' }, { id: 'force', unit: 'N', metric: 'force' }, { id: 'loss', unit: 'J', metric: 'loss' }];
const CHALLENGES = BENCHES.flatMap(b => QUESTIONS.map(q => ({ b, q, name: `${b.id}/${q.id}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function independent(b, d, percent = 80) {
  const ma = b.ma(d), eta = percent / 100, out = d[b.load] * d.loadDistance;
  return { idealForce: d[b.load] / ma, force: d[b.load] / (ma * eta), travel: d.loadDistance * ma,
    workOut: out, workIn: out / eta, loss: out / eta - out, actualMA: ma * eta, efficiency: eta };
}
function settings(d, b) { return Object.fromEntries([...Object.keys(b.settings), 'loadDistance'].map(k => [k, d[k]])); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE,
    benchDesignLimits: { [b.id]: { force: '5000', travel: '300' } }, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn();
  // A single UI render supplies all assertions until an event changes state.
  // This also avoids retaining dozens of large duplicate station trees.
  let renderedState, renderedTree;
  const render = () => {
    if (renderedState !== store.toolData.machineLab) {
      renderedState = store.toolData.machineLab;
      renderedTree = tool.render(makeCtx({ awardXP, tryAward }, store));
    }
    return renderedTree;
  };
  const find = predicate => nodes(render()).find(predicate);
  const byId = suffix => find(n => n.props?.id === `ml-efficiency-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-efficiency-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { render, find, store, awardXP, tryAward, byId, action, invoke, refresh: () => { renderedState = undefined; },
    state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-efficiency'] === store.toolData.machineLab.bench),
    comparison: () => find(n => n.props?.['data-ml-efficiency-comparison'] === store.toolData.machineLab.bench),
    metric: name => find(n => n.props?.['data-ml-efficiency-metric'] === name),
    result: () => find(n => n.props?.['data-ml-efficiency-result'] !== undefined)?.props['data-ml-efficiency-result'],
    fit: () => find(n => n.props?.['data-ml-efficiency-fit'] !== undefined)?.props['data-ml-efficiency-fit'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix} input`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    recordRow: (id = b.id) => find(n => n.props?.['data-ml-efficiency-record-station'] === id),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q = QUESTIONS[0], value = independent(BENCHES.find(b => b.id === s.state().bench), s.state())[q.metric]) {
  s.edit('question', q.id); s.edit('answer', value); s.edit('unit', q.unit); s.click('check');
}
function saved(extra = {}) {
  return { version: 1, benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 },
    percent: 80, question: 'input', answer: '250', unit: 'J', hint: 0, completion: 'checked', ...extra };
}

describe('Machine Lab: assumed efficiency physics', () => {
  it.each(BENCHES)('conserves energy and the geometric travel for $id at 1%, 37.5%, 80% and 100%', b => {
    for (const percent of [1, 37.5, 80, 100]) {
      const result = tool._math.efficiencyWork(BASE[b.load], BASE.loadDistance, b.ma(BASE), percent), expected = independent(b, BASE, percent);
      expect(result).toBeTruthy();
      for (const [key, value] of Object.entries(expected)) expect(result[key], key).toBeCloseTo(value, 9);
      expect(result.force * result.travel).toBeCloseTo(result.workIn, 8);
      expect(result.workOut + result.loss).toBeCloseTo(result.workIn, 8);
      expect(result.workOut / result.workIn).toBeCloseTo(percent / 100, 12);
      expect(result.force).toBeGreaterThanOrEqual(result.idealForce);
      if (percent === 100) { expect(result.loss).toBe(0); expect(result.force).toBe(result.idealForce); }
    }
  });

  it.each(['load', 'movement', 'mechanical advantage', 'efficiency'].map((name, index) => ({ name, index })))('rejects invalid $name without coercing strings or null', ({ index }) => {
    for (const value of [null, undefined, '', '80', true, {}, NaN, Infinity, -Infinity, -1, 0]) {
      const args = [400, 0.5, 2, 80]; args[index] = value;
      expect(tool._math.efficiencyWork(...args), String(value)).toBeNull();
    }
  });

  it('rejects efficiencies outside the supported range and calculations that overflow', () => {
    for (const percent of [0.999, 100.001, 101]) expect(tool._math.efficiencyWork(400, 0.5, 2, percent)).toBeNull();
    for (const args of [[Number.MAX_VALUE, 2, 2, 80], [400, 2, Number.MAX_VALUE, 80], [Number.MAX_VALUE, 0.5, Number.MIN_VALUE, 80]]) {
      expect(tool._math.efficiencyWork(...args)).toBeNull();
    }
  });
});

describe('Machine Lab: optional efficiency comparison', () => {
  it.each(BENCHES)('shows $id independent numeric results and starts both disclosures closed without changing state', b => {
    const s = session(b), before = s.state(), expected = independent(b, before);
    expect(s.panel().type).toBe('details'); expect(s.panel().props.open).not.toBe(true);
    expect(s.comparison().type).toBe('details'); expect(s.comparison().props.open).not.toBe(true);
    expect(s.byId('percent').props.value).toBe('80'); expect(s.byId('question').props.value).toBe('input');
    for (const key of ['force', 'travel', 'workIn', 'workOut', 'loss', 'actualMA']) {
      expect(Number(s.metric(key).props['data-value']), key).toBeCloseTo(expected[key], 10);
      expect(text(s.metric(key))).not.toMatch(/NaN|Infinity/);
    }
    expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true);
    expect(s.state()).toBe(before); expect(before.benchEfficiency).toBeUndefined();
    expect(text(s.panel())).toMatch(/assum|assumed/i); expect(text(s.panel())).toMatch(/geometry.*travel|travel.*same/i);
  });

  it.each(['k2', 'g35', 'g68', 'g912'])('gates the optional calculation lab for %s', bandOverride => {
    const s = session(BENCHES[0], { bandOverride });
    expect(!!s.panel()).toBe(['g68', 'g912'].includes(bandOverride));
  });

  it('keeps the ideal result and design fit independent while an 80% model can exceed its force limit', () => {
    const s = session(BENCHES[0], { benchDesignLimits: { lever: { force: '210', travel: '1' } } });
    expect(s.find(n => n.props?.['data-ml-design-fit'] !== undefined).props['data-ml-design-fit']).toBe('true');
    expect(s.fit()).toBe('false'); expect(Number(s.metric('force').props['data-value'])).toBe(250);
    const before = s.state(); s.edit('percent', '100');
    expect(s.fit()).toBe('true'); expect(Number(s.metric('force').props['data-value'])).toBe(200);
    expect(Number(s.metric('travel').props['data-value'])).toBe(1);
    expect({ ...s.state(), benchEfficiency: before.benchEfficiency }).toEqual(before);
  });

  it('uses existing default limits and independently detects unchanged travel exceeding its limit', () => {
    const s = session(BENCHES[0], { benchDesignLimits: undefined, leverLoad: 100 });
    expect(s.fit()).toBe('true');
    s.patch({ loadDistance: 2 }); expect(s.fit()).toBe('false');
    expect(Number(s.metric('force').props['data-value'])).toBe(62.5);
    expect(Number(s.metric('travel').props['data-value'])).toBe(4);
  });

  it.each(['', ' ', '0', '0.9', '100.1', 'Infinity', 'NaN', '80%', '1e2'])('rejects invalid efficiency draft %j without coercing or retaining computed results', percent => {
    const s = session(); s.edit('percent', percent);
    expect(s.byId('percent').props.value).toBe(percent); expect(s.byId('percent').props['aria-invalid']).toBe(true);
    expect(s.comparison()).toBeUndefined(); expect(s.action('check')).toBeUndefined(); expect(s.action('save')).toBeUndefined();
    expect(text(s.panel())).not.toMatch(/NaN|Infinity/);
  });

  it.each([
    ['force blank', { force: '', travel: '3' }], ['force range', { force: '5001', travel: '3' }],
    ['travel range', { force: '100', travel: '301' }], ['nonfinite', { force: Infinity, travel: '3' }]
  ])('omits the design comparison for %s while preserving valid efficiency practice', (_label, limits) => {
    const s = session(BENCHES[0], { benchDesignLimits: { lever: limits } });
    expect(s.fit()).toBeUndefined(); expect(s.metric('workIn')).toBeTruthy(); expect(s.action('check')).toBeTruthy();
  });

  it.each([
    ['zero load', { leverLoad: 0 }], ['wrong geometry type', { leverEffortArm: '2' }],
    ['missing geometry', { leverLoadArm: null }], ['nonfinite geometry', { leverEffortArm: Infinity }],
    ['out of range travel', { loadDistance: 3.1 }]
  ])('keeps invalid %s out of calculations', (_label, patch) => {
    const s = session(BENCHES[0], patch), before = s.state();
    expect(s.panel()).toBeTruthy(); expect(s.comparison()).toBeUndefined(); expect(s.action('check')).toBeUndefined();
    expect(s.state()).toBe(before);
  });

  it('labels every interactive field and announces grading without automatically revealing the answer', () => {
    const s = session(), all = nodes(s.panel());
    for (const key of ['percent', 'question', 'answer', 'unit']) {
      const input = s.byId(key);
      expect(all.some(n => n.type === 'label' && n.props.htmlFor === input.props.id)).toBe(true);
    }
    expect(s.byId('answer').props.inputMode).toBe('decimal');
    expect(s.result()).toBeUndefined();
    expect(all.some(n => n.props?.role === 'status' && n.props['aria-live'] === 'polite')).toBe(true);
    expect(nodes(s.comparison()).some(n => n.props?.['data-ml-efficiency-result'] !== undefined)).toBe(false);
  });
});

describe('Machine Lab: guided calculation practice', () => {
  it.each(CHALLENGES)('grades a correct independent $name answer with the required unit', ({ b, q }) => {
    const s = session(b); answer(s, q);
    expect(s.result()).toBe('correct'); expect(s.action('save').props.disabled).toBe(false);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });

  it.each(QUESTIONS)('requires the $unit unit for the $id question even when the number is correct', q => {
    const s = session(); answer(s, q);
    for (const unit of ['', 'm', q.unit === 'N' ? 'J' : 'N']) {
      s.edit('unit', unit); expect(s.result()).toBeUndefined(); s.click('check');
      expect(s.result()).toBe('unit'); expect(s.byId('unit').props['aria-invalid']).toBe(true);
      expect(s.action('save').props.disabled).toBe(true);
    }
  });

  it.each(['', ' ', '-1', 'Infinity', 'NaN', '250 J', '2.5e2'])('rejects malformed answer %j as an answer error before unit grading', value => {
    const s = session(); s.edit('answer', value); s.click('check');
    expect(s.result()).toBe('invalid'); expect(s.byId('answer').props['aria-invalid']).toBe(true);
    expect(s.action('save').props.disabled).toBe(true);
  });

  it('grades wrong arithmetic separately and accepts the documented one-percent tolerance boundary', () => {
    const s = session(); answer(s, QUESTIONS[0], 247.5); expect(s.result()).toBe('correct');
    s.edit('answer', '252.5'); s.click('check'); expect(s.result()).toBe('correct');
    s.edit('answer', '252.5001'); s.click('check'); expect(s.result()).toBe('incorrect');
    expect(s.action('save').props.disabled).toBe(true);
    s.edit('answer', '249'); expect(s.result()).toBeUndefined(); expect(s.byId('answer').props['aria-invalid']).toBe(false);
  });

  it('accepts zero loss at 100% efficiency and the absolute rounding allowance near zero', () => {
    const s = session(); s.edit('percent', '100'); answer(s, QUESTIONS[2], 0);
    expect(s.result()).toBe('correct');
    s.edit('answer', '0.0005'); s.click('check'); expect(s.result()).toBe('correct');
    s.edit('answer', '0.000501'); s.click('check'); expect(s.result()).toBe('incorrect');
  });

  it('supports Enter to check a calculation without submitting another action', () => {
    const s = session(); s.edit('answer', '250'); s.edit('unit', 'J'); const preventDefault = vi.fn();
    s.byId('answer').props.onKeyDown({ key: 'Enter', preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce(); expect(s.result()).toBe('correct');
  });

  it.each(QUESTIONS)('offers two progressive $id hints without marking an answer or revealing it', q => {
    const s = session(); s.edit('question', q.id);
    expect(s.find(n => n.props?.['data-ml-efficiency-hint-level'] !== undefined)).toBeUndefined();
    s.click('hint'); expect(s.find(n => n.props?.['data-ml-efficiency-hint-level'] !== undefined).props['data-ml-efficiency-hint-level']).toBe(1);
    expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true);
    s.click('hint'); expect(s.find(n => n.props?.['data-ml-efficiency-hint-level'] !== undefined).props['data-ml-efficiency-hint-level']).toBe(2);
    expect(s.action('hint').props.disabled).toBe(true); s.invoke(s.action('hint'));
    expect(s.state().benchEfficiency.lever.hint).toBe(2); expect(s.result()).toBeUndefined();
  });

  it('keeps viewed-solution provenance after later answer edits and checking', () => {
    const s = session(); s.click('reveal'); expect(s.result()).toBe('solution'); expect(s.action('reveal').props.disabled).toBe(true);
    s.edit('answer', '250'); s.edit('unit', 'J'); s.click('check');
    expect(s.result()).toBe('solution'); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever.completion).toBe('solution');
  });

  it.each([
    ['geometry', { leverEffortArm: 3 }], ['load', { leverLoad: 500 }], ['movement', { loadDistance: 0.6 }]
  ])('clears visible practice when the %s changes without rewriting the prior draft during render', (_label, patch) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); const stored = s.state().benchEfficiency;
    s.patch(patch); const before = s.state();
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined();
    expect(s.find(n => n.props?.['data-ml-efficiency-hint-level'] !== undefined)).toBeUndefined();
    expect(s.action('save').props.disabled).toBe(true); expect(s.state()).toBe(before); expect(s.state().benchEfficiency).toBe(stored);
  });

  it.each([['percent', '75'], ['question', 'force']])('clears answers, units, hints and completion after a %s change', (key, value) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); s.edit(key, value);
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined();
    expect(s.state().benchEfficiency.lever).toMatchObject({ answer: '', unit: '', hint: 0, checked: false, revealed: false });
  });

  it('keeps drafts separate between stations and does not invalidate practice for an unrelated bench edit', () => {
    const s = session(); answer(s); const leverDraft = s.state().benchEfficiency.lever;
    s.patch({ pulleyLoad: 500 }); expect(s.result()).toBe('correct');
    s.patch({ bench: 'pulley' }); expect(s.result()).toBeUndefined(); s.edit('percent', '60');
    expect(s.state().benchEfficiency.lever).toBe(leverDraft); s.patch({ bench: 'lever' });
    expect(s.result()).toBe('correct'); expect(s.byId('percent').props.value).toBe('80');
  });
});

describe('Machine Lab: honest saved efficiency work', () => {
  it.each(BENCHES)('saves $id fixed settings, answer, units and hint provenance without touching ideal evidence', b => {
    const retained = { provenBenches: { lever: true }, benchDesignRecords: { other: { note: 'keep' } },
      benchExperiments: { other: { note: 'keep evidence' } }, benchInvestigations: { other: { stage: 'predict' } },
      benchReferences: { other: { leverLoad: 400 } }, benchDesignUndo: { other: { key: 'untouched' } } };
    const s = session(b, retained), initial = s.state(); s.click('hint'); answer(s); s.click('hint'); s.click('save');
    const record = s.state().benchEfficiencyRecords[b.id];
    expect(record).toEqual({ version: 1, benchId: b.id, settings: settings(initial, b), percent: 80,
      question: 'input', answer: String(independent(b, initial).workIn), unit: 'J', hint: 1, completion: 'checked' });
    expect(record.settings).not.toBe(initial); for (const key of Object.keys(retained)) expect(s.state()[key]).toBe(initial[key]);
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(initial[key]);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });

  it('does not save unchecked, incorrect or unit-mismatched answers even if a disabled callback is invoked', () => {
    const s = session(); s.invoke(s.action('save')); expect(s.state().benchEfficiencyRecords).toBeUndefined();
    s.edit('answer', '250'); s.edit('unit', 'J'); s.invoke(s.action('save')); expect(s.state().benchEfficiencyRecords).toBeUndefined();
    s.edit('answer', '100'); s.click('check'); s.invoke(s.action('save')); expect(s.state().benchEfficiencyRecords).toBeUndefined();
    s.edit('answer', '250'); s.edit('unit', 'm'); s.click('check'); s.invoke(s.action('save')); expect(s.state().benchEfficiencyRecords).toBeUndefined();
  });

  it('permits a worked solution with no entered answer but labels it honestly', () => {
    const s = session(); s.click('reveal'); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever).toMatchObject({ answer: '', unit: '', hint: 0, completion: 'solution' });
    s.patch({ view: 'learn', manualTopic: 'record' });
    expect(text(s.recordRow())).toContain('Worked solution viewed'); expect(text(s.recordRow())).toContain('Entered answer: none');
  });

  it.each([
    ['geometry', { leverEffortArm: 3 }], ['task', { leverLoad: 500 }], ['station', { bench: 'pulley' }],
    ['view', { view: 'learn' }], ['efficiency', { benchEfficiency: { lever: { percent: '70' } } }]
  ])('rejects delayed check, hint, edit and save callbacks after the %s changes', (_label, patch) => {
    const s = session(); answer(s);
    const oldSave = s.action('save'), oldCheck = s.action('check'), oldHint = s.action('hint'), oldInput = s.byId('answer');
    s.patch(patch); const before = s.state();
    for (const n of [oldSave, oldCheck, oldHint]) s.invoke(n);
    oldInput.props.onChange({ target: { value: '999' } });
    expect(s.state()).toBe(before);
  });

  it('rechecks the latest answer before accepting an old save callback', () => {
    const s = session(); answer(s); const oldSave = s.action('save');
    s.edit('answer', '1'); s.invoke(oldSave); expect(s.state().benchEfficiencyRecords).toBeUndefined();
  });

  it('preserves a saved snapshot through Apply, Undo, and later assumption changes', () => {
    const s = session(); answer(s); s.click('save'); const original = s.state().benchEfficiencyRecords.lever;
    const trial = s.find(n => n.type === 'button' && n.props['data-ml-task-use'] === 'load');
    expect(trial.props.disabled).toBe(false); s.invoke(trial); expect(s.state().leverLoad).toBe(800);
    expect(s.state().benchEfficiencyRecords.lever).toBe(original); expect(s.result()).toBeUndefined();
    const undo = s.find(n => n.type === 'button' && n.props['data-ml-design-undo-use'] === 'lever'); s.invoke(undo);
    expect(s.state().leverLoad).toBe(400); expect(s.state().benchEfficiencyRecords.lever).toBe(original);
    s.edit('percent', '50'); s.patch({ leverLoad: 700, loadDistance: 0.9 });
    expect(s.state().benchEfficiencyRecords.lever).toBe(original);
    s.patch({ view: 'learn', manualTopic: 'record' });
    expect(text(s.recordRow())).toContain('250 N'); expect(text(s.recordRow())).toContain('250 J'); expect(text(s.recordRow())).toContain('50 J');
  });

  it('replaces only the active station record after a newly completed calculation', () => {
    const other = { keep: 'other record' }, s = session(BENCHES[0], { benchEfficiencyRecords: { pulley: other } });
    answer(s); s.click('save'); const original = s.state().benchEfficiencyRecords.lever;
    s.edit('percent', '50'); answer(s, QUESTIONS[0], 400); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever).not.toBe(original);
    expect(s.state().benchEfficiencyRecords.lever.percent).toBe(50); expect(s.state().benchEfficiencyRecords.pulley).toBe(other);
  });

  it.each([
    ['version', { version: 2 }], ['station', { benchId: 'pulley' }], ['missing settings', { settings: { leverLoad: 400 } }],
    ['string efficiency', { percent: '80' }], ['out of range efficiency', { percent: 101 }], ['invalid question', { question: 'power' }],
    ['invalid unit', { unit: 'W' }], ['invalid hint', { hint: 3 }], ['invalid completion', { completion: 'passed' }],
    ['forged checked answer', { answer: '999' }], ['forged checked unit', { unit: 'N' }], ['long answer', { answer: '2'.repeat(65) }]
  ])('omits imported efficiency records with %s', (_label, patch) => {
    const s = session(BENCHES[0], { benchEfficiencyRecords: { lever: saved(patch) } });
    expect(s.find(n => n.props?.['data-ml-efficiency-saved'] === 'lever')).toBeUndefined();
    s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow()).toBeUndefined();
  });

  it('derives saved results from the fixed task and exports honest solution and hint provenance', async () => {
    const record = saved({ completion: 'solution', answer: '<script>literal</script>', unit: '', hint: 2, force: 9999, workIn: 9999 });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', leverLoad: 900, leverEffortArm: 4,
      benchEfficiencyRecords: { lever: record } });
    const evidence = text(s.recordRow());
    for (const snippet of ['Recorded efficiency calculation: Lever', '80%', '400 N', '250 N', '200 J', '250 J', '50 J', 'Worked solution viewed', 'Hints opened: 2/2']) {
      expect(evidence).toContain(snippet);
    }
    expect(evidence).not.toContain('9999'); expect(s.html()).not.toContain('<script>literal</script>');
    const write = vi.fn(async () => true), clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    window.StemLab.writeClipboard = write;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try {
      s.refresh();
      s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve();
      expect(write).toHaveBeenCalledOnce(); const copied = write.mock.calls[0][0];
      for (const snippet of ['Recorded efficiency calculation: Lever', '80%', '250 N', '200 J', '250 J', '50 J', 'Worked solution viewed', 'Hints opened: 2/2', record.answer]) expect(copied).toContain(snippet);
      expect(copied).not.toContain('9999');
    } finally {
      if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      else delete navigator.clipboard;
    }
  });
});
