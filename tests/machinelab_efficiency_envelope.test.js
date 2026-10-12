import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Expectations follow independently stated force, travel and energy equations.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: 2 },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: 2 },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: 4.5 },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: 4 },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: 5 },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: 60 * Math.PI }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const SKILLS = [
  { id: 'minMA', unit: '×', words: /minimum.*MA/i }, { id: 'maxMA', unit: '×', words: /maximum.*MA/i },
  { id: 'forceEfficiency', unit: '%', words: /efficiency.*current.*MA/i },
  { id: 'taskEfficiency', unit: '%', words: /efficiency.*continuous.*MA/i }
];
const OLD = [
  { id: 'input', unit: 'J', value: 250, version: 1 }, { id: 'force', unit: 'N', value: 250, version: 1 },
  { id: 'loss', unit: 'J', value: 50, version: 1 }, { id: 'output', unit: 'J', value: 200, version: 2 },
  { id: 'efficiency', unit: '%', value: 80, version: 2 }, { id: 'actualMA', unit: '×', value: 1.6, version: 2 },
  { id: 'travel', unit: 'm', value: 1, version: 2 }
];
const KINDS = [...OLD, ...SKILLS].map(q => q.id);
const CASES = BENCHES.flatMap(b => SKILLS.map(q => ({ b, q, name: `${b.id}/${q.id}` })));
function expected(load = 400, movement = 0.5, ma = 2, percent = 80, force = 100, travel = 3) {
  return { minMA: load / (percent / 100 * force), maxMA: travel / movement,
    forceEfficiency: load / (ma * force) * 100, taskEfficiency: load * movement / (force * travel) * 100 };
}
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate);
  const byId = suffix => find(n => n.props?.id === `ml-efficiency-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-efficiency-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  const patch = change => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...change } }; };
  return { render, find, byId, action, invoke, patch, awardXP, tryAward, state: () => store.toolData.machineLab,
    refresh: () => { renderedState = undefined; },
    limits: (force, travel) => patch({ benchDesignLimits: { ...store.toolData.machineLab.benchDesignLimits, [b.id]: { force, travel } } }),
    metric: key => find(n => n.props?.['data-ml-efficiency-envelope-metric'] === key),
    chart: () => find(n => n.props?.['data-ml-efficiency-envelope'] !== undefined),
    planning: () => find(n => n.props?.['data-ml-efficiency-planning'] === b.id),
    status: () => find(n => n.props?.['data-ml-efficiency-envelope-status'] !== undefined)?.props['data-ml-efficiency-envelope-status'],
    result: () => find(n => n.props?.['data-ml-efficiency-result'] !== undefined)?.props['data-ml-efficiency-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    recordRow: () => find(n => n.props?.['data-ml-efficiency-record-station'] === b.id),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q, value) { s.edit('question', q.id); s.edit('answer', value); s.edit('unit', q.unit); s.click('check'); }
function record(q = SKILLS[0], extra = {}) {
  return { version: 3, benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 }, percent: 80,
    limits: { force: 100, travel: 3 }, question: q.id, answer: String(expected()[q.id]), unit: q.unit, hint: 0, completion: 'checked', ...extra };
}

describe('Machine Lab: independent efficiency envelope physics', () => {
  it.each(BENCHES)('derives independent $id interval and thresholds across efficiency and limit endpoints', b => {
    for (const [percent, force, travel] of [[80, 100, 3], [100, 1, 0.1], [1, 5000, 300], [37.5, 237.5, 2.25]]) {
      const load = b.settings[b.load], target = expected(load, 0.5, b.ma, percent, force, travel);
      const result = tool._math.efficiencyEnvelope(load, 0.5, b.ma, percent, force, travel); expect(result).toBeTruthy();
      for (const q of SKILLS) expect(result[q.id], q.id).toBeCloseTo(target[q.id], 9);
      expect(result.idealMA).toBe(b.ma); expect(result.forceLimit).toBe(force); expect(result.travelLimit).toBe(travel);
      expect(result.feasible).toBe(target.minMA <= target.maxMA);
      expect(result.force).toBeCloseTo(load / (b.ma * percent / 100), 8);
      expect(result.travel).toBeCloseTo(b.ma * 0.5, 9); expect(result.workIn).toBeCloseTo(load * 0.5 / (percent / 100), 8);
      expect(result.minMA * force * percent / 100).toBeCloseTo(load, 8);
      expect(result.maxMA * 0.5).toBeCloseTo(travel, 8);
    }
  });
  it.each(['load', 'movement', 'MA', 'efficiency', 'force limit', 'travel limit'].map((name, index) => ({ name, index })))('rejects invalid $name without coercion', ({ index }) => {
    for (const value of [null, undefined, '', '5', true, {}, NaN, Infinity, -Infinity, -1, 0]) {
      const args = [400, 0.5, 2, 80, 100, 3]; args[index] = value;
      expect(tool._math.efficiencyEnvelope(...args), `${index}:${String(value)}`).toBeNull();
    }
  });
  it('enforces inclusive efficiency and planning-limit domains', () => {
    for (const [index, value] of [[3, 0.999], [3, 100.001], [4, 0.999], [4, 5000.001], [5, 0.0999], [5, 300.001]]) {
      const args = [400, 0.5, 2, 80, 100, 3]; args[index] = value; expect(tool._math.efficiencyEnvelope(...args)).toBeNull();
    }
    expect(tool._math.efficiencyEnvelope(400, 0.5, 2, 1, 1, 0.1)).toBeTruthy();
    expect(tool._math.efficiencyEnvelope(400, 0.5, 2, 100, 5000, 300)).toBeTruthy();
  });
  it('rejects inherited overflow and overflow introduced by planning quotients', () => {
    for (const args of [[Number.MAX_VALUE, 2, 2, 80, 100, 3], [400, 2, Number.MAX_VALUE, 80, 100, 3],
      [400, Number.MIN_VALUE, 2, 80, 100, 300], [Number.MAX_VALUE / 4, 0.1, Number.MAX_VALUE / 4, 100, 1, 0.1]]) {
      expect(tool._math.efficiencyEnvelope(...args)).toBeNull();
    }
  });
  it('keeps the interval independent of current MA while changing the current-effort threshold', () => {
    const first = tool._math.efficiencyEnvelope(400, 0.5, 2, 80, 100, 3), other = tool._math.efficiencyEnvelope(400, 0.5, 10, 80, 100, 3);
    for (const key of ['minMA', 'maxMA', 'taskEfficiency', 'feasible']) expect(other[key]).toBe(first[key]);
    expect(other.forceEfficiency).toBe(first.forceEfficiency / 5); expect(other.travel).toBe(first.travel * 5);
  });
  it('changes only the force-derived minimum when assumed efficiency changes', () => {
    const first = tool._math.efficiencyEnvelope(400, 0.5, 2, 80, 100, 3), other = tool._math.efficiencyEnvelope(400, 0.5, 2, 40, 100, 3);
    expect(other.minMA).toBe(first.minMA * 2);
    for (const key of ['maxMA', 'forceEfficiency', 'taskEfficiency', 'travel']) expect(other[key]).toBe(first[key]);
    expect(first.feasible).toBe(true); expect(other.feasible).toBe(false);
  });
  it('retains sub-one and over-one-hundred-percent thresholds and exactly touching limits', () => {
    const low = tool._math.efficiencyEnvelope(10, 0.1, 100, 1, 5000, 300);
    expect(low.forceEfficiency).toBeCloseTo(0.002, 12); expect(low.taskEfficiency).toBeCloseTo(1 / 15000, 12);
    const high = tool._math.efficiencyEnvelope(400, 0.5, 2, 80, 1, 0.1); expect(high.taskEfficiency).toBe(200000); expect(high.forceEfficiency).toBe(20000);
    const point = tool._math.efficiencyEnvelope(400, 0.5, 4, 100, 100, 2);
    expect(point.minMA).toBe(4); expect(point.maxMA).toBe(4); expect(point.taskEfficiency).toBe(100); expect(point.feasible).toBe(true);
  });
  it('does not inflate an exact impossible interval into a numerical-tolerance fit', () => {
    const result = tool._math.efficiencyEnvelope(400, 0.5, 4, 100, 100, 1.999999999999);
    expect(result.minMA).toBeGreaterThan(result.maxMA); expect(result.feasible).toBe(false); expect(result.taskEfficiency).toBeGreaterThan(100);
  });
});

describe('Machine Lab: efficiency envelope visualization', () => {
  it.each(BENCHES)('shows proportional $id rows, exact metrics and current markers without altering settings', b => {
    const s = session(b), before = s.state(), target = expected(before[b.load], 0.5, b.ma), chart = s.chart();
    expect(s.planning().type).toBe('details'); expect(s.planning().props.open).not.toBe(true); expect(chart.type).toBe('figure');
    expect(nodes(chart).some(n => n.props?.id === chart.props['aria-labelledby'])).toBe(true);
    for (const q of SKILLS) { expect(Number(s.metric(q.id).props['data-value'])).toBeCloseTo(target[q.id], 10); expect(text(s.metric(q.id))).toContain(String(Number(s.metric(q.id).props['data-value']))); }
    const domain = Number(chart.props['data-domain-max']); expect(domain).toBeGreaterThan(Math.max(b.ma, target.minMA, target.maxMA));
    const bounds = { effort: [target.minMA, domain], travel: [0, target.maxMA], both: [target.minMA, target.maxMA] };
    for (const kind of ['effort', 'travel', 'both']) {
      const track = nodes(chart).find(n => n.props?.['data-ml-efficiency-envelope-track'] === kind), bar = nodes(track).find(n => n.props?.['data-ml-efficiency-envelope-bar'] === kind);
      expect(track.props['aria-hidden']).toBe('true');
      if (kind === 'both' && target.minMA > target.maxMA) { expect(bar).toBeUndefined(); continue; }
      expect(Number(bar.props['data-start'])).toBeCloseTo(bounds[kind][0], 10); expect(Number(bar.props['data-end'])).toBeCloseTo(bounds[kind][1], 10);
      expect(parseFloat(bar.props.style.left)).toBeCloseTo(bounds[kind][0] / domain * 100, 10);
      expect(parseFloat(bar.props.style.width)).toBeCloseTo((bounds[kind][1] - bounds[kind][0]) / domain * 100, 10);
      expect(bar.props.style.minWidth ?? 0).toBe(0);
    }
    const markers = nodes(chart).filter(n => n.props?.['data-ml-efficiency-envelope-marker'] === 'currentMA'); expect(markers).toHaveLength(3);
    for (const marker of markers) { expect(Number(marker.props['data-value'])).toBeCloseTo(b.ma, 10); expect(parseFloat(marker.props.style.left)).toBeCloseTo(b.ma / domain * 100, 10); }
    expect(text(s.planning())).toMatch(/continuous MA/); expect(text(s.planning())).toMatch(/whole numbers/); expect(text(chart)).not.toMatch(/NaN|Infinity/);
    expect(s.state()).toBe(before); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('distinguishes range, point and even an extremely narrow empty interval', () => {
    const s = session(); s.edit('percent', 100); expect(s.status()).toBe('range');
    s.limits(100, 2); expect(s.status()).toBe('point');
    const pointBar = nodes(s.chart()).find(n => n.props?.['data-ml-efficiency-envelope-bar'] === 'both'); expect(parseFloat(pointBar.props.style.width)).toBe(0);
    expect(s.find(n => n.props?.['data-ml-efficiency-envelope-point'] !== undefined)).toBeTruthy();
    s.limits(100, 1.999999999999); expect(s.status()).toBe('empty');
    expect(nodes(s.chart()).find(n => n.props?.['data-ml-efficiency-envelope-bar'] === 'both')).toBeUndefined();
    const threshold = Number(s.metric('taskEfficiency').props['data-value']); expect(threshold).toBeGreaterThan(100); expect(text(s.metric('taskEfficiency'))).toContain(String(threshold));
  });
  it('offers eleven labeled skills and keeps unavailable planning separate from seven valid legacy skills', () => {
    const s = session(); expect(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual(KINDS);
    s.limits('', 3); expect(s.chart()).toBeUndefined();
    for (const q of SKILLS) { s.edit('question', q.id); expect(s.byId('question')).toBeTruthy(); expect(s.action('check')).toBeUndefined(); expect(s.action('save')).toBeUndefined(); expect(s.find(n => n.props?.['data-ml-efficiency-planning-unavailable'] !== undefined)).toBeTruthy(); }
    for (const q of OLD) { answer(s, q, q.value); expect(s.result()).toBe('correct'); }
  });
});

describe('Machine Lab: efficiency envelope skill practice', () => {
  it.each(CASES)('checks, saves and reloads $name from independent givens', ({ b, q }) => {
    const s = session(b), before = s.state(), target = expected(before[b.load], 0.5, b.ma)[q.id], entered = String(Number(target.toPrecision(3)));
    answer(s, q, entered); expect(s.result()).toBe('correct'); expect(s.state().benchEfficiencyRecords).toBeUndefined(); s.click('save');
    expect(s.state().benchEfficiencyRecords[b.id]).toEqual({ version: 3, benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, percent: 80,
      limits: { force: 100, travel: 3 }, question: q.id, answer: entered, unit: q.unit, hint: 0, completion: 'checked' });
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(before[key]);
    const restored = session(b, { view: 'learn', manualTopic: 'record', benchEfficiencyRecords: JSON.parse(JSON.stringify(s.state().benchEfficiencyRecords)) });
    expect(restored.recordRow()).toBeTruthy(); expect(text(restored.recordRow())).toMatch(q.words); expect(text(restored.recordRow())).toContain('Answer checked');
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(SKILLS)('requires the requested unit for $id and rejects blank, negative and nonfinite answers', q => {
    const s = session(); answer(s, q, expected()[q.id]);
    for (const value of ['', '-1', 'Infinity', 'abc']) { s.edit('answer', value); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.action('save').props.disabled).toBe(true); }
    s.edit('answer', expected()[q.id]); s.edit('unit', q.unit === '%' ? '×' : '%'); s.click('check'); expect(s.result()).toBe('unit');
    s.invoke(s.action('save')); expect(s.state().benchEfficiencyRecords).toBeUndefined(); s.edit('unit', q.unit); s.click('check'); expect(s.result()).toBe('correct');
  });
  it.each(SKILLS)('accepts one-percent rounding but rejects larger errors for $id', q => {
    const s = session(), target = expected()[q.id]; answer(s, q, target * 0.9901); expect(s.result()).toBe('correct');
    for (const [scale, result] of [[1.0099, 'correct'], [0.9899, 'incorrect'], [1.0101, 'incorrect']]) { s.edit('answer', target * scale); s.click('check'); expect(s.result()).toBe(result); }
  });
  it.each(SKILLS)('reveals progressive $id hints and permanently retains viewed-solution provenance', q => {
    const s = session(); s.edit('question', q.id); s.click('hint'); expect(s.find(n => n.props?.['data-ml-efficiency-hint-level'] === 1)).toBeTruthy();
    s.click('hint'); expect(s.find(n => n.props?.['data-ml-efficiency-hint-level'] === 2)).toBeTruthy(); expect(s.action('save').props.disabled).toBe(true);
    s.click('reveal'); expect(s.result()).toBe('solution'); s.click('save'); expect(s.state().benchEfficiencyRecords.lever).toMatchObject({ version: 3, question: q.id, answer: '', unit: '', hint: 2, completion: 'solution' });
    s.edit('answer', expected()[q.id]); s.edit('unit', q.unit); s.click('check'); expect(s.result()).toBe('solution'); s.click('save'); expect(s.state().benchEfficiencyRecords.lever.completion).toBe('solution');
  });
});

describe('Machine Lab: efficiency envelope state integrity', () => {
  it.each([
    ['force limit', { benchDesignLimits: { lever: { force: 200, travel: 3 } } }], ['travel limit', { benchDesignLimits: { lever: { force: 100, travel: 4 } } }],
    ['invalid limit', { benchDesignLimits: { lever: { force: '', travel: 3 } } }], ['station', { bench: 'pulley' }], ['view', { view: 'learn' }],
    ['geometry', { leverEffortArm: 3 }], ['load', { leverLoad: 500 }], ['movement', { loadDistance: 0.6 }]
  ])('rejects delayed check, next and save after the %s changes', (_name, patch) => {
    const s = session(); answer(s, SKILLS[0], 5); const actions = ['check', 'next', 'save'].map(s.action);
    s.patch(patch); const before = s.state(); for (const action of actions) s.invoke(action); expect(s.state()).toBe(before); expect(s.state().benchEfficiencyRecords).toBeUndefined();
  });
  it('keeps an equivalent numeric limit formatting change from invalidating a checked planning answer', () => {
    const s = session(); answer(s, SKILLS[0], 5); s.limits('100.0', '3.000'); expect(s.result()).toBe('correct'); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever.limits).toEqual({ force: 100, travel: 3 });
  });
  it('preserves a checked old skill through invalid planning limits and saves its original schema', () => {
    const s = session(); answer(s, OLD[0], 250); const save = s.action('save'); s.limits('', 3); expect(s.result()).toBe('correct'); s.invoke(save);
    expect(s.state().benchEfficiencyRecords.lever).toMatchObject({ version: 1, question: 'input', answer: '250' }); expect(s.state().benchEfficiencyRecords.lever).not.toHaveProperty('limits');
  });
  it('cycles the four planning skills back to input and resets practice without saving', () => {
    const s = session(); s.edit('question', SKILLS[0].id);
    for (let i = 0; i < SKILLS.length; i++) { expect(s.byId('question').props.value).toBe(SKILLS[i].id); s.edit('answer', '123'); s.edit('unit', 'J'); s.click('hint'); s.click('reveal'); s.click('next');
      expect(s.byId('question').props.value).toBe(SKILLS[i + 1]?.id || 'input'); expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined(); }
    expect(s.state().benchEfficiencyRecords).toBeUndefined();
  });
  it('keeps the saved settings and limits immutable while replacing only the active station on explicit save', () => {
    const other = { note: 'preserved' }, s = session(BENCHES[0], { benchEfficiencyRecords: { pulley: other } }); answer(s, SKILLS[0], 5); s.click('save');
    const first = s.state().benchEfficiencyRecords.lever; s.limits(200, 4); s.patch({ leverLoad: 800 }); expect(s.state().benchEfficiencyRecords.lever).toBe(first);
    expect(first.settings.leverLoad).toBe(400); expect(first.limits).toEqual({ force: 100, travel: 3 }); answer(s, SKILLS[0], 5); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever).not.toBe(first); expect(s.state().benchEfficiencyRecords.lever.limits).toEqual({ force: 200, travel: 4 }); expect(s.state().benchEfficiencyRecords.pulley).toBe(other);
  });
  it('retains below-one-percent and above-one-hundred-percent answers without clamping', () => {
    const s = session(); s.limits(5000, 300); const small = 400 * 0.5 / (5000 * 300) * 100;
    answer(s, SKILLS[3], 0); expect(s.result()).toBe('incorrect'); s.edit('answer', small); s.click('check'); expect(s.result()).toBe('correct'); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever.answer).toBe(String(small));
    s.limits(100, 1.999999999999); const high = 400 * 0.5 / (100 * 1.999999999999) * 100; answer(s, SKILLS[3], high); s.click('reveal');
    expect(text(s.find(n => n.props?.['data-ml-efficiency-result'] !== undefined))).toContain(String(high));
    s.click('save'); s.patch({ view: 'learn', manualTopic: 'record' }); expect(text(s.recordRow())).toContain(String(high));
  });
  it('uses full screw geometry in force-threshold givens and ramp vertical movement in travel practice', () => {
    const screw = session(BENCHES[5]); screw.edit('question', 'forceEfficiency'); expect(text(screw.find(n => n.props?.['data-ml-efficiency-given'] !== undefined))).toContain(String(60 * Math.PI));
    const ramp = session(BENCHES[3]); ramp.edit('question', 'maxMA'); ramp.click('hint'); expect(text(ramp.planning())).toMatch(/ranges/);
    expect(text(ramp.find(n => n.props?.['data-ml-efficiency-hint-level'] === 1))).toMatch(/vertical rise/);
  });
});

describe('Machine Lab: verifiable efficiency envelope records', () => {
  it.each(SKILLS)('requires version 3 and independently verifies the saved $id arithmetic and units', q => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record' });
    for (const patch of [{ version: 1 }, { version: 2 }, { answer: '99999' }, { unit: q.unit === '%' ? '×' : '%' }]) { s.patch({ benchEfficiencyRecords: { lever: record(q, patch) } }); expect(s.recordRow()).toBeUndefined(); }
    s.patch({ benchEfficiencyRecords: { lever: record(q) } }); expect(s.recordRow()).toBeTruthy();
  });
  it.each([
    ['missing limits', { limits: undefined }], ['array limits', { limits: [] }], ['string force', { limits: { force: '100', travel: 3 } }],
    ['string travel', { limits: { force: 100, travel: '3' } }], ['force outside range', { limits: { force: 5001, travel: 3 } }],
    ['travel outside range', { limits: { force: 100, travel: 0.09 } }], ['nonfinite limit', { limits: { force: NaN, travel: 3 } }],
    ['wrong station', { benchId: 'pulley' }], ['invalid geometry', { settings: { leverLoad: 400, loadDistance: 0.5 } }],
    ['string efficiency', { percent: '80' }], ['unknown unit', { unit: 'W' }], ['invalid hint', { hint: 3 }], ['invalid completion', { completion: 'passed' }]
  ])('omits a version-3 record with %s', (_name, patch) => {
    const s = session(BENCHES[0], { benchEfficiencyRecords: { lever: record(SKILLS[0], patch) } });
    expect(s.find(n => n.props?.['data-ml-efficiency-saved'] === 'lever')).toBeUndefined(); s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow()).toBeUndefined();
  });
  it('keeps all seven old record schemas readable and rejects relabeling them as planning records', () => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', benchDesignLimits: { lever: { force: '', travel: '' } } });
    for (const q of OLD) {
      const legacy = record(SKILLS[0], { version: q.version, question: q.id, answer: String(q.value), unit: q.unit }); delete legacy.limits;
      s.patch({ benchEfficiencyRecords: { lever: legacy } }); expect(s.recordRow()).toBeTruthy(); expect(s.state().benchEfficiencyRecords.lever).toBe(legacy);
      s.patch({ benchEfficiencyRecords: { lever: { ...legacy, version: 3 } } }); expect(s.recordRow()).toBeUndefined();
    }
  });
  it('retains viewed-solution distractor input honestly while rejecting it as a checked answer', () => {
    const saved = record(SKILLS[1], { answer: 'bad answer', unit: '%', completion: 'solution', hint: 2 });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', benchEfficiencyRecords: { lever: saved } });
    expect(text(s.recordRow())).toContain('Worked solution viewed'); expect(text(s.recordRow())).toContain('bad answer %');
    s.patch({ benchEfficiencyRecords: { lever: { ...saved, completion: 'checked' } } }); expect(s.recordRow()).toBeUndefined();
  });
  it('exports recomputed fixed task and limits with full threshold precision and honest provenance', async () => {
    const travel = 1.999999999999, threshold = 400 * 0.5 / (100 * travel) * 100;
    const saved = record(SKILLS[3], { limits: { force: 100, travel }, answer: '<script>literal</script>', unit: '', completion: 'solution', hint: 2, taskEfficiency: 8675309 });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', leverLoad: 900, benchDesignLimits: { lever: { force: 5000, travel: 300 } }, benchEfficiencyRecords: { lever: saved } });
    const evidence = text(s.recordRow()); for (const part of ['400 N', String(travel), String(threshold), 'Worked solution viewed', 'Hints opened: 2/2']) expect(evidence).toContain(part);
    expect(evidence).not.toContain('8675309'); expect(s.html()).not.toContain('<script>literal</script>');
    const write = vi.fn(async () => true), descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard'); window.StemLab.writeClipboard = write;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try { s.refresh(); s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve(); expect(write).toHaveBeenCalledOnce();
      const copied = write.mock.calls[0][0]; for (const part of ['400 N', String(travel), String(threshold), 'Worked solution viewed', saved.answer]) expect(copied).toContain(part);
      expect(s.state().benchEfficiencyRecords.lever).toBe(saved);
    } finally { if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else delete navigator.clipboard; }
  });
});
