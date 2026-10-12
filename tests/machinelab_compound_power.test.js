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
const KINDS = ['inputPower', 'transferPower', 'usefulPower', 'firstLossPower', 'secondLossPower'];
const ENERGY = ['inputWork', 'transferWork', 'workOut', 'firstLoss', 'secondLoss'];
const PAIRS = BENCHES.flatMap(first => BENCHES.filter(second => second !== first).map(second => ({ first, second, name: `${first.id}/${second.id}` })));
const CHALLENGES = BENCHES.flatMap(b => KINDS.map(kind => ({ b, kind, name: `${b.id}/${kind}` })));
const defaultSecond = b => BENCHES.find(x => x.id === (b.id === 'pulley' ? 'lever' : 'pulley'));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
// Independent equations and fixtures; no production helper supplies expectations.
function independent(load, distance, firstMA, secondMA, firstPercent = 80, secondPercent = 90, seconds = 5) {
  const firstEta = firstPercent / 100, secondEta = secondPercent / 100, idealMA = firstMA * secondMA, workOut = load * distance;
  const transferWork = workOut / secondEta, inputWork = transferWork / firstEta;
  const firstLoss = Math.max(0, inputWork - transferWork), secondLoss = Math.max(0, transferWork - workOut);
  return { idealMA, efficiency: firstPercent * secondPercent / 100, actualMA: idealMA * firstEta * secondEta,
    inputForce: load / (idealMA * firstEta * secondEta), inputTravel: distance * idealMA,
    transferForce: load / (secondMA * secondEta), transferTravel: distance * secondMA,
    workOut, transferWork, inputWork, firstLoss, secondLoss, totalLoss: firstLoss + secondLoss, seconds,
    inputPower: inputWork / seconds, transferPower: transferWork / seconds, usefulPower: workOut / seconds, firstLossPower: firstLoss / seconds, secondLossPower: secondLoss / seconds };
}
function expected(s) {
  const d = s.state(), b = BENCHES.find(x => x.id === d.bench), draft = d.benchCompound?.[b.id] || {}, second = BENCHES.find(x => x.id === (draft.second || defaultSecond(b).id));
  const output = draft.geometry ? Object.fromEntries(Object.entries(draft.geometry).map(([k, v]) => [k, Number(v)])) : second.geometry;
  return independent(d[b.load], d.loadDistance, b.ma(d), second.ma(output), Number(draft.percentIn ?? 80), Number(draft.percentOut ?? 90), Number(draft.duration ?? 5) * (draft.timeUnit === 'min' ? 60 : 1));
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
    metric: key => find(n => n.props?.['data-ml-compound-power-metric'] === key),
    energy: key => find(n => n.props?.['data-ml-compound-metric'] === key),
    result: () => find(n => n.props?.['data-ml-compound-result'] !== undefined)?.props['data-ml-compound-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, suffix).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    row: (kind = 'inputPower', id = b.id) => find(n => n.props?.['data-ml-compound-record-station'] === id && n.props?.['data-ml-compound-record-skill'] === kind),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, kind = 'inputPower', value) { s.edit('question', kind); s.edit('answer', value ?? expected(s)[kind]); s.edit('unit', 'W'); s.click('check'); }
function record(extra = {}) {
  return { version: 2, benchId: 'lever', second: 'pulley', inputSettings: { ...BENCHES[0].geometry }, outputSettings: { ...BENCHES[1].geometry }, load: 400, loadDistance: 0.5,
    percentIn: 80, percentOut: 90, seconds: 5, question: 'inputPower', answer: String(independent(400, 0.5, 2, 2).inputPower), unit: 'W', hint: 0, completion: 'checked', explanation: '', ...extra };
}
function legacy(extra = {}) { const r = record({ version: 1, question: 'idealMA', answer: '4', unit: 'ratio', ...extra }); delete r.seconds; return r; }

describe('Machine Lab: compound power physics', () => {
  it.each(PAIRS)('conserves independently calculated work and power across $name', ({ first, second }) => {
    for (const [p1, p2, seconds] of [[80, 90, 5], [100, 100, 0.01], [1, 1, 3600], [99.999999, 37.5, 120]]) {
      const args = [first.loadValue, 0.5, first.ma(BASE), second.ma(BASE), p1, p2, seconds], actual = tool._math.compoundPower(...args), want = independent(...args);
      expect(actual).toBeTruthy(); for (const [key, value] of Object.entries(want)) expect(actual[key], key).toBeCloseTo(value, 7);
      for (let i = 0; i < KINDS.length; i++) expect(actual[KINDS[i]] * seconds).toBeCloseTo(actual[ENERGY[i]], 7);
      expect(actual.usefulPower + actual.firstLossPower + actual.secondLossPower).toBeCloseTo(actual.inputPower, 7);
      expect(actual.transferPower + actual.firstLossPower).toBeCloseTo(actual.inputPower, 7);
      expect(actual.usefulPower + actual.secondLossPower).toBeCloseTo(actual.transferPower, 7);
    }
  });
  it.each(['load', 'distance', 'first MA', 'second MA', 'first efficiency', 'second efficiency', 'seconds'].map((name, index) => ({ name, index })))('rejects invalid $name without coercion', ({ index }) => {
    for (const value of [null, undefined, '', '5', true, {}, NaN, Infinity, -Infinity, 0, -1]) { const args = [400, 0.5, 2, 2, 80, 90, 5]; args[index] = value; expect(tool._math.compoundPower(...args)).toBeNull(); }
  });
  it('enforces converted duration bounds and rejects power overflow even when work stays finite', () => {
    for (const seconds of [0.009999, 3600.000001]) expect(tool._math.compoundPower(400, 0.5, 2, 2, 80, 90, seconds)).toBeNull();
    for (const seconds of [0.01, 3600]) expect(tool._math.compoundPower(400, 0.5, 2, 2, 80, 90, seconds)).toBeTruthy();
    expect(tool._math.compoundPower(Number.MAX_VALUE / 2, 1, 2, 2, 100, 100, 0.01)).toBeNull();
    expect(tool._math.compoundPower(400, 2, Number.MAX_VALUE, 2, 80, 90, 5)).toBeNull();
  });
  it('halves every power when duration doubles while leaving all work and force values unchanged', () => {
    const first = tool._math.compoundPower(400, 0.5, 2, 4, 80, 90, 5), slower = tool._math.compoundPower(400, 0.5, 2, 4, 80, 90, 10);
    for (const key of Object.keys(first).filter(key => key !== 'seconds' && !KINDS.includes(key))) expect(slower[key], key).toBe(first[key]);
    for (const key of KINDS) expect(slower[key]).toBe(first[key] / 2);
  });
});

describe('Machine Lab: compound power comparison', () => {
  it.each(BENCHES)('shows five independent $id power metrics without mutating render state', b => {
    const s = session(b), initial = s.state(), want = expected(s); expect(s.byId('duration').props.value).toBe('5'); expect(s.byId('timeUnit').props.value).toBe('s');
    for (const kind of KINDS) { expect(Number(s.metric(kind).props['data-value']), kind).toBeCloseTo(want[kind], 10); expect(text(s.metric(kind))).toContain('W'); }
    expect(nodes(s.panel()).filter(n => n.props?.['data-ml-compound-metric'] !== undefined)).toHaveLength(13); expect(s.state()).toBe(initial); expect(s.state().benchCompound).toBeUndefined();
  });
  it.each(['k2', 'g35', 'g68', 'g912'])('retains the existing grade gate for %s', bandOverride => { const s = session(BENCHES[0], { bandOverride }); expect(!!s.metric('inputPower')).toBe(['g68', 'g912'].includes(bandOverride)); });
  it('converts two minutes into 120 seconds for all five power values and keeps the work unchanged', () => {
    const s = session(), initialEnergy = Number(s.energy('inputWork').props['data-value']); s.edit('duration', '2'); s.edit('timeUnit', 'min');
    const want = expected(s); for (const kind of KINDS) expect(Number(s.metric(kind).props['data-value'])).toBeCloseTo(want[kind], 12);
    expect(Number(s.energy('inputWork').props['data-value'])).toBe(initialEnergy); answer(s, 'inputPower'); s.click('save'); expect(s.state().benchCompoundRecords.lever.inputPower.seconds).toBe(120);
  });
  it.each(['', ' ', '0', '-1', '0.009', '3600.1', 'Infinity', 'NaN', '5e0', '5 s'])('keeps energy practice usable when duration %j is invalid', value => {
    const s = session(); s.edit('duration', value); expect(s.byId('duration').props['aria-invalid']).toBe(true); expect(s.metric('inputPower')).toBeUndefined(); expect(s.energy('inputWork')).toBeTruthy();
    s.edit('answer', '4'); s.edit('unit', 'ratio'); s.click('check'); expect(s.result()).toBe('correct'); s.click('save'); expect(s.state().benchCompoundRecords.lever.idealMA.version).toBe(1);
  });
  it.each(KINDS)('disables and guards %s actions when time is invalid while keeping the skill selectable', kind => {
    const s = session(); s.edit('duration', ''); s.edit('question', kind); const before = s.state();
    for (const action of ['check', 'hint', 'reveal', 'save']) { expect(s.action(action).props.disabled).toBe(true); s.invoke(s.action(action)); }
    s.byId('answer').props.onKeyDown({ key: 'Enter', preventDefault: vi.fn() }); expect(s.state()).toBe(before); expect(s.result()).toBeUndefined();
    expect(text(s.panel())).not.toMatch(/NaN|Infinity|undefined/); s.edit('duration', '5'); answer(s, kind); expect(s.result()).toBe('correct');
  });
  it('applies the maximum after minutes conversion', () => {
    const s = session(); s.edit('timeUnit', 'min'); s.edit('duration', '60'); expect(s.metric('inputPower')).toBeTruthy(); s.edit('duration', '60.0001'); expect(s.byId('duration').props['aria-invalid']).toBe(true); expect(s.metric('inputPower')).toBeUndefined();
  });
  it('associates duration and time-unit controls with explicit mechanical-power guidance', () => {
    const s = session(), all = nodes(s.panel());
    for (const key of ['duration', 'timeUnit']) { expect(all.some(n => n.type === 'label' && n.props.htmlFor === s.byId(key).props.id)).toBe(true); expect(s.byId(key).props['aria-describedby']).toBe('ml-compound-time-help-lever'); }
    expect(text(s.find(n => n.props?.id === 'ml-compound-time-help-lever'))).toMatch(/average mechanical powers/i);
  });
});

describe('Machine Lab: compound power skills', () => {
  it.each(CHALLENGES)('grades an independent rounded $name answer without awarding progress', ({ b, kind }) => {
    const s = session(b); answer(s, kind, Number(expected(s)[kind].toPrecision(3))); expect(s.result()).toBe('correct'); expect(s.action('save').props.disabled).toBe(false); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(KINDS)('requires watts for %s instead of accepting joules, newtons or an empty unit', kind => {
    const s = session(); answer(s, kind);
    for (const unit of ['J', 'N', '']) { s.edit('unit', unit); s.click('check'); expect(s.result()).toBe('unit'); expect(s.action('save').props.disabled).toBe(true); expect(s.byId('unit').props['aria-invalid']).toBe(true); }
  });
  it.each(['', ' ', '-1', 'Infinity', 'NaN', '40 W', '4e1'])('rejects invalid power answer %j before unit grading', value => {
    const s = session(); s.edit('question', 'usefulPower'); s.edit('answer', value); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.action('save').props.disabled).toBe(true);
  });
  it('accepts the exact one-percent boundary and rejects a larger discrepancy', () => {
    const s = session(); s.edit('duration', '2'); answer(s, 'usefulPower', 99); expect(s.result()).toBe('correct'); s.edit('answer', '101'); s.click('check'); expect(s.result()).toBe('correct'); s.edit('answer', '101.00001'); s.click('check'); expect(s.result()).toBe('incorrect');
  });
  it('preserves tiny near-ideal losses and rejects zero as their answer', () => {
    const s = session(); s.edit('percentIn', '99.999999'); s.edit('percentOut', '100'); answer(s, 'firstLossPower', 0); expect(s.result()).toBe('incorrect');
    expect(Number(s.metric('firstLossPower').props['data-value'])).toBeGreaterThan(0); expect(text(s.metric('firstLossPower'))).not.toMatch(/\d[eE][+-]?\d/); s.edit('answer', '0.0000004'); s.click('check'); expect(s.result()).toBe('correct');
    s.edit('percentIn', '100'); answer(s, 'firstLossPower', 0); expect(s.result()).toBe('correct'); s.edit('answer', '0.000001'); s.click('check'); expect(s.result()).toBe('incorrect');
  });
  it.each(KINDS)('offers progressive %s hints that distinguish joules from watts', kind => {
    const s = session(); s.edit('question', kind);
    for (const level of [1, 2]) { s.click('hint'); expect(s.find(n => n.props?.['data-ml-compound-hint-level'] !== undefined).props['data-ml-compound-hint-level']).toBe(level); expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true); }
    expect(text(s.panel())).toMatch(/joule per second|joule.*second/i); expect(text(s.panel())).toContain('÷ 5 s'); expect(s.action('hint').props.disabled).toBe(true);
  });
  it('gives power-specific feedback and asks students to reason about doubling time', () => {
    const s = session(); answer(s, 'inputPower', 1); const feedback = text(s.find(n => n.props?.['data-ml-compound-result'] !== undefined)); expect(feedback).toContain('duration in seconds');
    expect(text(s.find(n => n.props?.id === 'ml-compound-reason-help-lever'))).toContain('twice as long'); expect(text(s.find(n => n.props?.id === 'ml-compound-reason-help-lever'))).toContain('watts');
  });
  it('checks power on Enter and keeps solution-viewed provenance after edits', () => {
    const s = session(); s.edit('question', 'usefulPower'); s.edit('answer', '40'); s.edit('unit', 'W'); const preventDefault = vi.fn(); s.byId('answer').props.onKeyDown({ key: 'Enter', preventDefault }); expect(preventDefault).toHaveBeenCalledOnce(); expect(s.result()).toBe('correct');
    s.click('reveal'); s.edit('answer', '40'); s.click('check'); expect(s.result()).toBe('solution'); s.click('save'); expect(s.state().benchCompoundRecords.lever.usefulPower.completion).toBe('solution');
  });
});

describe('Machine Lab: compound power identity', () => {
  it.each([['duration', '10'], ['timeUnit', 'min']])('resets answers, hints and reasoning when %s changes', (key, value) => {
    const s = session(); answer(s); s.click('hint'); s.click('reveal'); s.edit('explanation', 'Earlier timing'); s.edit(key, value);
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.byId('explanation').props.value).toBe(''); expect(s.result()).toBeUndefined();
    expect(s.state().benchCompound.lever).toMatchObject({ hint: 0, checked: false, revealed: false });
  });
  it.each([['duration', '10'], ['timeUnit', 'min']])('rejects every delayed callback after a %s change', (key, value) => {
    const s = session(); answer(s); const callbacks = ['check', 'hint', 'reveal', 'save', 'next'].map(s.action), inputs = ['answer', 'duration', 'timeUnit', 'explanation'].map(s.byId); s.edit(key, value); const before = s.state();
    callbacks.forEach(s.invoke); inputs.forEach(n => n.props.onChange({ target: { value: '999' } })); expect(s.state()).toBe(before);
  });
  it('rechecks the latest power answer before accepting an old save callback', () => {
    const s = session(); answer(s); const oldSave = s.action('save'); s.edit('answer', '1'); s.invoke(oldSave); expect(s.state().benchCompoundRecords).toBeUndefined();
  });
  it('keeps task timing independent from animation and other calculation drafts', () => {
    const retained = { benchPower: { lever: { duration: '20', timeUnit: 'min' } }, benchEfficiency: { lever: { percent: '50' } }, shopDemoDuration: 2200, shopSlowMotion: true }, s = session(BENCHES[0], retained), before = s.state();
    expect(s.byId('duration').props.value).toBe('5'); s.edit('duration', '10'); for (const key of Object.keys(retained)) expect(s.state()[key]).toBe(before[key]);
    s.patch({ shopDemoDuration: 4000 }); answer(s); expect(s.result()).toBe('correct');
  });
  it('preserves separate station timing drafts and ignores secondary workshop changes', () => {
    const s = session(); s.edit('duration', '10'); answer(s); const first = s.state().benchCompound.lever; s.patch({ pulleyLoad: 700, pulleySegments: 6 }); expect(s.result()).toBe('correct');
    s.patch({ bench: 'pulley' }); expect(s.byId('duration').props.value).toBe('5'); s.edit('duration', '2'); s.edit('timeUnit', 'min'); expect(s.state().benchCompound.lever).toBe(first); s.patch({ bench: 'lever' }); expect(s.byId('duration').props.value).toBe('10'); expect(s.result()).toBe('correct');
  });
});

describe('Machine Lab: compound power records', () => {
  it.each(BENCHES)('saves fixed v2 $id timing and geometry without altering other learning records', b => {
    const old = legacy(), retained = { benchEfficiencyRecords: { other: { keep: true } }, benchPowerRecords: { other: { keep: true } }, benchExperiments: { other: { keep: true } }, benchInvestigations: { other: { keep: true } }, provenBenches: { other: true }, benchCompoundRecords: { lever: { idealMA: old } } };
    const s = session(b, retained), initial = s.state(); s.edit('duration', '2'); s.edit('timeUnit', 'min'); answer(s); s.click('hint'); s.edit('explanation', 'The same energy transferred over more seconds means lower power.'); s.click('save');
    expect(s.state().benchCompoundRecords[b.id].inputPower).toEqual({ version: 2, benchId: b.id, second: defaultSecond(b).id, inputSettings: { ...b.geometry }, outputSettings: { ...defaultSecond(b).geometry }, load: b.loadValue, loadDistance: 0.5,
      percentIn: 80, percentOut: 90, seconds: 120, question: 'inputPower', answer: String(expected(s).inputPower), unit: 'W', hint: 1, completion: 'checked', explanation: 'The same energy transferred over more seconds means lower power.' });
    expect(s.state().benchCompoundRecords.lever.idealMA).toBe(old); for (const key of Object.keys(retained).filter(k => k !== 'benchCompoundRecords')) expect(s.state()[key]).toBe(initial[key]); for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(initial[key]);
  });
  it('retains exact v1 energy snapshots when saving alongside new power records', () => {
    const s = session(); s.edit('duration', '2'); s.edit('timeUnit', 'min'); s.edit('answer', '4'); s.edit('unit', 'ratio'); s.click('check'); s.click('save');
    expect(s.state().benchCompoundRecords.lever.idealMA).toEqual(legacy()); const first = s.state().benchCompoundRecords.lever.idealMA;
    for (const kind of KINDS) { answer(s, kind); s.click('save'); }
    expect(s.state().benchCompoundRecords.lever.idealMA).toBe(first); expect(Object.keys(s.state().benchCompoundRecords.lever).sort()).toEqual(['idealMA', ...KINDS].sort());
    expect(s.find(n => n.props?.['data-ml-compound-count'] !== undefined).props['data-ml-compound-count']).toBe(6);
    const preserved = s.state().benchCompoundRecords.lever.transferPower; s.edit('duration', '3'); answer(s); s.click('save'); expect(s.state().benchCompoundRecords.lever.transferPower).toBe(preserved);
  });
  it('retains legacy records without inventing their task time or migrating their version', () => {
    const old = legacy(), s = session(BENCHES[0], { benchCompoundRecords: { lever: { idealMA: old } } }), initial = s.state();
    expect(s.find(n => n.props?.['data-ml-compound-saved'] === 'lever')).toBeTruthy(); expect(s.state()).toBe(initial); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.row('idealMA')).toBeTruthy(); expect(text(s.row('idealMA'))).not.toContain('Task duration:'); expect(s.state().benchCompoundRecords.lever.idealMA).toBe(old);
  });
  it('keeps a saved power task fixed through later timing, geometry and workshop changes', () => {
    const s = session(); answer(s, 'usefulPower'); s.edit('explanation', 'At five seconds, useful power is forty watts.'); s.click('save'); const first = s.state().benchCompoundRecords.lever.usefulPower;
    s.edit('duration', '2'); s.edit('timeUnit', 'min'); s.edit('geometry-pulleySegments', '4'); s.patch({ leverLoad: 700, leverEffortArm: 4, view: 'learn', manualTopic: 'record' });
    expect(s.state().benchCompoundRecords.lever.usefulPower).toBe(first); const evidence = text(s.row('usefulPower')); for (const snippet of ['40 W', '5 s', '400 N', '80%', '90%']) expect(evidence).toContain(snippet);
    expect(evidence).toContain('At five seconds, useful power is forty watts.'); expect(evidence).not.toContain('120 s');
  });
  it('allows saved worked solutions with honest hint and explanation provenance', () => {
    const s = session(); s.edit('question', 'transferPower'); s.click('hint'); s.click('hint'); s.click('reveal'); s.click('save'); expect(s.state().benchCompoundRecords.lever.transferPower).toMatchObject({ version: 2, seconds: 5, answer: '', unit: '', hint: 2, completion: 'solution' });
    s.patch({ view: 'learn', manualTopic: 'record' }); expect(text(s.row('transferPower'))).toContain('Worked solution viewed'); expect(text(s.row('transferPower'))).toContain('Hints opened: 2/2');
  });
  it.each([
    ['legacy version for power', { version: 1 }], ['future version', { version: 3 }], ['missing time', { seconds: undefined }], ['typed time', { seconds: '5' }], ['null time', { seconds: null }],
    ['too-short time', { seconds: 0.009 }], ['too-long time', { seconds: 3601 }], ['nonfinite time', { seconds: Infinity }], ['wrong station', { benchId: 'pulley' }], ['same stage', { second: 'lever' }],
    ['incomplete input geometry', { inputSettings: {} }], ['incomplete output geometry', { outputSettings: {} }], ['typed efficiency', { percentIn: '80' }], ['efficiency range', { percentOut: 101 }],
    ['forged answer', { answer: '999' }], ['energy unit', { unit: 'J' }], ['invalid hints', { hint: 3 }], ['false completion', { completion: 'passed' }], ['oversized explanation', { explanation: 'x'.repeat(601) }]
  ])('omits imported power evidence with %s', (_label, patch) => {
    const s = session(BENCHES[0], { benchCompoundRecords: { lever: { inputPower: record(patch) } } }); expect(s.find(n => n.props?.['data-ml-compound-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.row()).toBeUndefined();
  });
  it('rejects v2 energy records and mismatched skill keys', () => {
    const s = session(BENCHES[0], { benchCompoundRecords: { lever: { idealMA: record({ question: 'idealMA', answer: '4', unit: 'ratio' }), transferPower: record() } } });
    expect(s.find(n => n.props?.['data-ml-compound-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.row('idealMA')).toBeUndefined(); expect(s.row('transferPower')).toBeUndefined();
  });
  it('recomputes imported power values and safely exports fixed givens, literal answers and explanations', async () => {
    const imported = record({ question: 'usefulPower', answer: '<script>literal</script>', unit: '', completion: 'solution', hint: 2, explanation: '<img src=x onerror=alert(1)> Energy stays the same.', usefulPower: 9999, secondsLabel: '9999 seconds' });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', leverLoad: 800, benchCompoundRecords: { lever: { usefulPower: imported } } });
    const evidence = text(s.row('usefulPower')); for (const snippet of ['40 W', '5 s', '400 N', '80%', '90%', '200 J', 'Worked solution viewed', 'Hints opened: 2/2', imported.explanation]) expect(evidence).toContain(snippet); expect(evidence).not.toContain('9999'); expect(s.html()).not.toContain('<script>literal</script>'); expect(s.html()).not.toContain('<img src=x');
    const write = vi.fn(async () => true), descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard'); window.StemLab.writeClipboard = write; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try { s.refresh(); s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve(); expect(write).toHaveBeenCalledOnce(); const copied = write.mock.calls[0][0]; for (const snippet of ['40 W', '5 s', '400 N', '80%', '90%', imported.answer, imported.explanation]) expect(copied).toContain(snippet); expect(copied).not.toContain('9999'); }
    finally { if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else delete navigator.clipboard; }
  });
});
