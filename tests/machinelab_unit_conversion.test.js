import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Unit expectations are derived from independent geometry, work and SI factors.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const SKILLS = [
  { id: 'powerKilowatts', unit: 'kW', metric: 'kilowatts', from: 'watts', factor: 1 / 1000 },
  { id: 'powerWatts', unit: 'W', metric: 'watts', from: 'kilowatts', factor: 1000 },
  { id: 'timeMinutes', unit: 'min', metric: 'minutes', from: 'seconds', factor: 1 / 60 },
  { id: 'timeSeconds', unit: 's', metric: 'seconds', from: 'minutes', factor: 60 },
  { id: 'speedCentimetres', unit: 'cm/s', metric: 'centimetresPerSecond', from: 'metresPerSecond', factor: 100 },
  { id: 'speedMetres', unit: 'm/s', metric: 'metresPerSecond', from: 'centimetresPerSecond', factor: 1 / 100 }
];
const CONVERSIONS = SKILLS.map(q => q.id);
function expected(b, d = BASE, percent = 80, seconds = 5) {
  const watts = d[b.load] * d.loadDistance / (percent / 100) / seconds;
  const metresPerSecond = d.loadDistance * b.ma(d) / seconds;
  return { watts, kilowatts: watts / 1000, seconds, minutes: seconds / 60,
    metresPerSecond, centimetresPerSecond: metresPerSecond * 100 };
}
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate), byId = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-power-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { render, find, byId, action, invoke, awardXP, tryAward, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    guide: () => find(n => n.props?.['data-ml-power-units'] === store.toolData.machineLab.bench),
    metric: key => find(n => n.props?.['data-ml-power-unit-metric'] === key),
    skill: key => find(n => n.props?.['data-ml-power-skill'] === key),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    recordRow: question => find(n => n.props?.['data-ml-power-record-station'] === b.id && n.props?.['data-ml-power-record-skill'] === question),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q, value) { s.edit('question', q.id); s.edit('answer', value); s.edit('unit', q.unit); s.click('check'); }
function values(s) { return Object.fromEntries(SKILLS.map(q => [q.metric, Number(s.metric(q.metric).props['data-value'])])); }
function record(q = SKILLS[0], b = BENCHES[0], extra = {}) {
  return { version: 5, benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, percent: 80, seconds: 5, budget: 100,
    question: q.id, answer: String(expected(b)[q.metric]), unit: q.unit, hint: 0, completion: 'checked', ...extra };
}

describe('Machine Lab: unit conversion guide', () => {
  it.each(BENCHES)('derives six equivalent $id quantities across efficiency and time boundaries', b => {
    const s = session(b);
    for (const [percent, seconds] of [[80, 5], [1, 0.01], [100, 3600], [37.5, 12.5]]) {
      s.edit('percent', percent); s.edit('duration', seconds); const before = s.state(), want = expected(b, BASE, percent, seconds), actual = values(s);
      expect(s.guide()?.type).toBe('details'); expect(s.guide().props.open).not.toBe(true);
      expect(nodes(s.guide()).filter(n => n.props?.['data-ml-power-unit-metric'])).toHaveLength(6);
      for (const q of SKILLS) {
        expect(actual[q.metric] / want[q.metric], q.metric).toBeCloseTo(1, 12);
        expect(actual[q.metric] / actual[q.from], q.id).toBeCloseTo(q.factor, 12);
      }
      expect(text(s.guide())).not.toMatch(/NaN|Infinity/); expect(s.state()).toBe(before);
    }
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('retains the existing valid-model and middle-school visibility gates', () => {
    for (const bandOverride of ['k2', 'g35', 'g68', 'g912']) expect(!!session(BENCHES[0], { bandOverride }).guide()).toBe(['g68', 'g912'].includes(bandOverride));
    for (const patch of [{ leverEffortArm: 0 }, { benchPower: { lever: { percent: '0' } } }, { benchPower: { lever: { duration: '0' } } }, { benchPower: { lever: { budget: '0' } } }]) {
      const s = session(BENCHES[0], patch); expect(s.guide()).toBeUndefined(); expect(s.action('check')).toBeUndefined();
    }
  });
  it('treats minute input as elapsed seconds once and converts that same task both ways', () => {
    const s = session(); s.edit('duration', 2); s.edit('timeUnit', 'min'); const actual = values(s), want = expected(BENCHES[0], BASE, 80, 120);
    for (const q of SKILLS) { expect(actual[q.metric] / want[q.metric]).toBeCloseTo(1, 12); answer(s, q, want[q.metric]); expect(s.result()).toBe('correct'); }
    expect(actual.seconds).toBe(120); expect(actual.minutes).toBe(2);
  });
});

describe('Machine Lab: unit conversion practice', () => {
  it.each(BENCHES)('checks and saves all six $id conversions as version-5 snapshots', b => {
    const s = session(b), initial = s.state();
    for (const q of SKILLS) {
      s.invoke(s.skill(q.id)); expect(s.byId('question').props.value).toBe(q.id); expect(s.skill(q.id).props['aria-pressed']).toBe(true);
      expect(s.action('open-guide').props['data-ml-power-open-guide']).toBe('units');
      const entered = String(Number(expected(b)[q.metric].toPrecision(3))); answer(s, q, entered); expect(s.result()).toBe('correct');
      expect(s.state().benchPowerRecords?.[b.id]?.[q.id]).toBeUndefined(); s.click('save');
      expect(s.state().benchPowerRecords[b.id][q.id]).toEqual(record(q, b, { answer: entered }));
      expect(s.skill(q.id).props['data-ml-power-skill-status']).toBe('checked'); expect(s.skill(q.id).props['data-ml-power-skill-setup']).toBe('current');
    }
    const restored = session(b, { view: 'learn', manualTopic: 'record', benchPowerRecords: JSON.parse(JSON.stringify(s.state().benchPowerRecords)) });
    for (const q of SKILLS) { expect(text(restored.recordRow(q.id))).toContain('Answer checked'); expect(text(restored.recordRow(q.id))).toContain(' ' + q.unit); }
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(initial[key]);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(SKILLS)('rejects reversed and missing factors for $id and requires the requested unit', q => {
    const s = session(), want = expected(BENCHES[0]);
    for (const incorrect of [want[q.from], want[q.from] / q.factor]) { answer(s, q, incorrect); expect(s.result()).toBe('incorrect'); }
    answer(s, q, want[q.metric]); expect(s.result()).toBe('correct');
    for (const unit of ['', 'J', ...SKILLS.map(x => x.unit).filter(unit => unit !== q.unit)]) {
      s.edit('unit', unit); s.click('check'); expect(s.result()).toBe('unit'); expect(s.byId('unit').props['aria-invalid']).toBe(true);
      expect(text(s.find(n => n.props?.['data-ml-power-result'] === 'unit'))).toContain(q.unit);
      expect(s.action('save').props.disabled).toBe(true); s.invoke(s.action('save')); expect(s.state().benchPowerRecords).toBeUndefined();
    }
  });
  it.each(SKILLS)('uses relative one-percent rounding and progressive hints for $id', q => {
    const s = session(), target = expected(BENCHES[0])[q.metric]; s.edit('question', q.id);
    expect(s.find(n => n.props?.['data-ml-power-hint-level'] !== undefined)).toBeUndefined();
    for (const level of [1, 2]) { s.click('hint'); expect(s.find(n => n.props?.['data-ml-power-hint-level'] === level)).toBeTruthy(); }
    expect(s.action('hint').props.disabled).toBe(true); expect(s.action('save').props.disabled).toBe(true);
    for (const [scale, result] of [[0, 'incorrect'], [0.9899, 'incorrect'], [1.0101, 'incorrect'], [0.9901, 'correct'], [1.0099, 'correct']]) {
      s.edit('answer', target * scale); s.edit('unit', q.unit); expect(s.result()).toBeUndefined(); s.click('check'); expect(s.result()).toBe(result);
    }
    for (const input of ['', '-1', 'NaN', 'Infinity', 'abc']) { s.edit('answer', input); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.action('save').props.disabled).toBe(true); }
  });
  it('keeps very small legal kilowatt and speed answers positive and checks their relative error', () => {
    const b = BENCHES[0], settings = { ...BASE, leverLoad: 50, leverEffortArm: 0.2, leverLoadArm: 4, loadDistance: 0.1 };
    const s = session(b, settings); s.edit('percent', 100); s.edit('duration', 3600); const want = expected(b, settings, 100, 3600);
    expect(want.kilowatts).toBeLessThan(0.00001); expect(want.metresPerSecond).toBeLessThan(0.00001);
    for (const q of [SKILLS[0], SKILLS[5]]) {
      answer(s, q, 0); expect(s.result()).toBe('incorrect'); answer(s, q, want[q.metric] * 1.0101); expect(s.result()).toBe('incorrect');
      answer(s, q, Number(want[q.metric].toPrecision(3))); expect(s.result()).toBe('correct');
      expect(text(s.find(n => n.props?.['data-ml-power-result'] === 'correct'))).not.toMatch(/= 0 /);
    }
  });
  it('appends six conversions across 122 station skills and wraps the final skill to input power', () => {
    let count = 0;
    for (const b of BENCHES) {
      const s = session(b), kinds = nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value); count += kinds.length;
      expect(kinds.slice(-6)).toEqual(CONVERSIONS); expect(kinds).toHaveLength(['windlass', 'screw'].includes(b.id) ? 25 : 18);
      s.edit('question', 'loadFromPower'); s.click('next');
      for (let i = 0; i < SKILLS.length; i++) {
        expect(s.byId('question').props.value).toBe(SKILLS[i].id); s.edit('answer', '123'); s.edit('unit', 'W'); s.click('hint'); s.click('reveal'); s.click('next');
        expect(s.byId('question').props.value).toBe(SKILLS[i + 1]?.id || 'inputPower'); expect(s.byId('answer').props.value).toBe('');
        expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined();
      }
      expect(s.state().benchPowerRecords).toBeUndefined();
    }
    expect(count).toBe(122);
  });
});

describe('Machine Lab: unit conversion guarded state', () => {
  it.each([
    ['station', { bench: 'screw' }], ['view', { view: 'learn' }], ['geometry', { leverEffortArm: 0.5 }],
    ['assumptions', { benchPower: { lever: { percent: '40', question: 'powerKilowatts' } } }], ['question', { benchPower: { lever: { question: 'timeMinutes' } } }]
  ])('rejects delayed conversion handlers after %s changes', (_name, patch) => {
    const s = session(); answer(s, SKILLS[0], 0.05); const actions = ['check', 'hint', 'reveal', 'save', 'next'].map(s.action), input = s.byId('answer'), card = s.skill('timeMinutes');
    s.patch(patch); const before = s.state(); actions.forEach(s.invoke); s.invoke(card); input.props.onChange({ target: { value: '999' } });
    expect(s.state()).toBe(before); expect(s.state().benchPowerRecords).toBeUndefined();
  });
  it('keeps unrelated notes and existing records while changing conversion questions', () => {
    const fixed = record(), saved = { lever: { powerKilowatts: fixed }, screw: { retained: 'note' } }, s = session(BENCHES[0], { benchPowerRecords: saved, designReflection: 'Keep this note' });
    answer(s, SKILLS[0], 0.05); const oldInput = s.byId('answer'), oldCheck = s.action('check'), oldSave = s.action('save'); s.invoke(s.skill('timeMinutes')); const before = s.state();
    oldInput.props.onChange({ target: { value: '999' } }); s.invoke(oldCheck); s.invoke(oldSave); expect(s.state()).toBe(before);
    expect(s.state().benchPowerRecords).toBe(saved); expect(s.state().designReflection).toBe('Keep this note');
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined();
  });
});

describe('Machine Lab: unit conversion saved evidence', () => {
  it.each(SKILLS)('revalidates $id arithmetic and keeps viewed solutions distinct from checked work', q => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record' });
    for (const patch of [{ version: 1 }, { version: 2 }, { version: 3 }, { version: 4 }, { answer: '999999' }, { unit: 'J' }, { settings: { leverLoad: 400 } }, { percent: '80' }, { seconds: 0 }, { hint: 3 }, { completion: 'passed' }]) {
      s.patch({ benchPowerRecords: { lever: { [q.id]: record(q, BENCHES[0], patch) } } }); expect(s.recordRow(q.id)).toBeUndefined();
    }
    s.patch({ benchPowerRecords: { lever: { [q.id]: record(q) } } }); expect(s.recordRow(q.id)).toBeTruthy();
    const practicing = session(); practicing.edit('question', q.id); practicing.click('hint'); practicing.click('hint'); practicing.click('reveal'); practicing.click('save');
    expect(practicing.state().benchPowerRecords.lever[q.id]).toMatchObject({ version: 5, answer: '', unit: '', hint: 2, completion: 'solution' });
    practicing.edit('answer', expected(BENCHES[0])[q.metric]); practicing.edit('unit', q.unit); practicing.click('check'); expect(practicing.result()).toBe('solution'); practicing.click('save');
    expect(practicing.state().benchPowerRecords.lever[q.id].completion).toBe('solution'); expect(practicing.skill(q.id).props['data-ml-power-skill-status']).toBe('solution');
  });
  it('renders valid versions one through five together and rejects relabeled versions', () => {
    const b = BENCHES[4], saved = {
      inputPower: record(SKILLS[0], b, { version: 1, question: 'inputPower', answer: '50', unit: 'W' }),
      budgetEnergy: record(SKILLS[0], b, { version: 2, question: 'budgetEnergy', answer: '500', unit: 'J' }),
      turns: record(SKILLS[0], b, { version: 3, question: 'turns', answer: String(0.5 / (2 * Math.PI * 0.1)), unit: 'turns' }),
      loadFromPower: record(SKILLS[0], b, { version: 4, question: 'loadFromPower', answer: '400', unit: 'N' }),
      powerKilowatts: record(SKILLS[0], b)
    };
    const s = session(b, { view: 'learn', manualTopic: 'record', benchPowerRecords: { windlass: saved } });
    for (const [kind, rec] of Object.entries(saved)) {
      expect(s.recordRow(kind)).toBeTruthy(); s.patch({ benchPowerRecords: { windlass: { [kind]: { ...rec, version: rec.version === 5 ? 4 : 5 } } } }); expect(s.recordRow(kind)).toBeUndefined();
      s.patch({ benchPowerRecords: { windlass: saved } });
    }
  });
  it('keeps new units exclusive to conversions even for legacy viewed-solution records', () => {
    const b = BENCHES[4], s = session(b, { view: 'learn', manualTopic: 'record' });
    for (const [question, version] of [['inputPower', 1], ['budgetEnergy', 2], ['turns', 3], ['loadFromPower', 4]]) {
      for (const unit of ['kW', 'min', 'cm/s']) {
        s.patch({ benchPowerRecords: { windlass: { [question]: record(SKILLS[0], b, { question, version, answer: 'draft', unit, completion: 'solution' }) } } }); expect(s.recordRow(question)).toBeUndefined();
      }
      s.patch({ benchPowerRecords: { windlass: { [question]: record(SKILLS[0], b, { question, version, answer: 'draft', unit: 'W', completion: 'solution' }) } } }); expect(s.recordRow(question)).toBeTruthy();
    }
    const practicing = session(); for (const unit of ['kW', 'min', 'cm/s']) { practicing.edit('unit', unit); expect(practicing.byId('unit').props.value).toBe(''); }
  });
  it('retains fixed conversion snapshots after setup changes and escapes saved drafts', () => {
    const b = BENCHES[4], s = session(b); s.edit('duration', 2); s.edit('timeUnit', 'min'); answer(s, SKILLS[2], 2); s.click('save');
    const fixed = s.state().benchPowerRecords.windlass.timeMinutes; expect(fixed.seconds).toBe(120); s.patch({ windlassLoad: 800, loadDistance: 1 });
    expect(s.state().benchPowerRecords.windlass.timeMinutes).toBe(fixed); expect(s.skill('timeMinutes').props['data-ml-power-skill-setup']).toBe('earlier');
    const viewed = { ...fixed, answer: '<script>literal</script>', unit: 'cm/s', completion: 'solution', hint: 2, minutes: 8675309 };
    const restored = session(b, { view: 'learn', manualTopic: 'record', windlassLoad: 800, benchPowerRecords: { windlass: { timeMinutes: viewed } } });
    const evidence = text(restored.recordRow('timeMinutes')); expect(evidence).toContain('400 N'); expect(evidence).toContain('120 s'); expect(evidence).toContain('2 min'); expect(evidence).toContain('Hints opened: 2/2');
    expect(evidence).not.toContain('8675309'); expect(restored.html()).not.toContain('<script>literal</script>');
  });
});
