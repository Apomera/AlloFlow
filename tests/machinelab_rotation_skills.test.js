import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Expected turns, angles, torque work and power are derived from independent geometry.
const BENCHES = [
  { id: 'windlass', load: 'windlassLoad', radius: 'windlassHandleR', advance: 0.2 * Math.PI,
    settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 } },
  { id: 'screw', load: 'screwLoad', radius: 'screwHandleR', advance: 0.005,
    settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 } }
];
const BASE = Object.assign({ loadDistance: 0.5, leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400,
  pulleySegments: 2, pulleyLoad: 400, rampLength: 4, rampHeight: 1, rampLoad: 400,
  wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ...BENCHES.map(b => b.settings));
const SKILLS = [
  { id: 'turns', unit: 'turns', words: /turn/i }, { id: 'angularTravel', unit: 'rad', words: /angle|angular|radian/i },
  { id: 'omega', unit: 'rad/s', words: /angular|rad\/s/i }, { id: 'rotationalWork', unit: 'J', words: /work|energy/i },
  { id: 'rotationalPower', unit: 'W', words: /power/i }
];
const LINEAR_KINDS = ['inputPower', 'usefulPower', 'lossPower', 'handSpeed', 'loadSpeed', 'budgetTime'];
const PLANNING_KINDS = ['budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'];
const ROTARY_KINDS = [...LINEAR_KINDS, 'torque', 'rpm', ...PLANNING_KINDS, ...SKILLS.map(q => q.id)];
const CASES = BENCHES.flatMap(b => SKILLS.map(q => ({ b, q, name: `${b.id}/${q.id}` })));
function expected(b, settings = b.settings, movement = 0.5, percent = 80, seconds = 5) {
  const radius = settings[b.radius], load = settings[b.load];
  const advance = b.id === 'windlass' ? 2 * Math.PI * settings.windlassDrumR : settings.screwPitch;
  const turns = movement / advance, angularTravel = turns * 2 * Math.PI;
  const handCircumference = 2 * Math.PI * radius, force = load * advance / (handCircumference * percent / 100), torque = force * radius;
  return { turns, angularTravel, omega: angularTravel / seconds, rotationalWork: torque * angularTravel,
    rotationalPower: torque * angularTravel / seconds, handCircumference, loadAdvance: advance };
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
    refresh: () => { renderedState = undefined; },
    guide: () => find(n => n.props?.['data-ml-power-rotation'] === store.toolData.machineLab.bench),
    metric: key => find(n => n.props?.['data-ml-power-rotation-metric'] === key),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    recordRow: question => find(n => n.props?.['data-ml-power-record-station'] === b.id && n.props?.['data-ml-power-record-skill'] === question),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q, value) { s.edit('question', q.id); s.edit('answer', value); s.edit('unit', q.unit); s.click('check'); }
function record(q = SKILLS[0], extra = {}) {
  return { version: 3, benchId: 'windlass', settings: { ...BENCHES[0].settings, loadDistance: 0.5 }, percent: 80, seconds: 5, budget: 100,
    question: q.id, answer: String(expected(BENCHES[0])[q.id]), unit: q.unit, hint: 0, completion: 'checked', ...extra };
}
function values(s) { return Object.fromEntries(SKILLS.map(q => [q.id, Number(s.metric(q.id).props['data-value'])])); }

describe('Machine Lab: independent rotary geometry and visuals', () => {
  it.each(BENCHES)('derives $id rotation and torque work from independent geometry across endpoints', b => {
    const s = session(b);
    for (const [percent, seconds] of [[80, 5], [1, 0.01], [100, 3600], [37.5, 12.5]]) {
      s.edit('percent', percent); s.edit('duration', seconds); const target = expected(b, b.settings, 0.5, percent, seconds);
      for (const q of SKILLS) expect(values(s)[q.id], q.id).toBeCloseTo(target[q.id], 7);
      expect(values(s).rotationalWork).toBeCloseTo(b.settings[b.load] * 0.5 / (percent / 100), 7);
      expect(values(s).rotationalPower * seconds).toBeCloseTo(values(s).rotationalWork, 7);
    }
  });
  it.each(BENCHES)('doubles $id work and power with load while preserving rotation', b => {
    const s = session(b), before = values(s); s.patch({ [b.load]: b.settings[b.load] * 2 }); const after = values(s);
    for (const key of ['turns', 'angularTravel', 'omega']) expect(after[key]).toBeCloseTo(before[key], 10);
    for (const key of ['rotationalWork', 'rotationalPower']) expect(after[key]).toBeCloseTo(before[key] * 2, 8);
  });
  it.each(BENCHES)('keeps $id turn count and torque work independent of handle radius', b => {
    const s = session(b), before = values(s); s.patch({ [b.radius]: b.settings[b.radius] * 0.5 }); const after = values(s);
    for (const q of SKILLS) expect(after[q.id], q.id).toBeCloseTo(before[q.id], 9);
    expect(Number(s.find(n => n.props?.['data-ml-power-metric'] === 'handSpeed').props['data-value'])).toBeCloseTo(expected(b).handCircumference * expected(b).turns / 5 * 0.5, 9);
  });
  it.each(BENCHES)('separates $id efficiency, time and budget effects from geometric rotation', b => {
    const s = session(b), before = values(s); s.edit('percent', 40); const inefficient = values(s);
    for (const key of ['turns', 'angularTravel', 'omega']) expect(inefficient[key]).toBeCloseTo(before[key], 10);
    expect(inefficient.rotationalWork).toBeCloseTo(before.rotationalWork * 2, 8); expect(inefficient.rotationalPower).toBeCloseTo(before.rotationalPower * 2, 8);
    s.edit('duration', 10); const slower = values(s); expect(slower.omega).toBeCloseTo(before.omega / 2, 10);
    expect(slower.rotationalWork).toBeCloseTo(inefficient.rotationalWork, 8); expect(slower.rotationalPower).toBeCloseTo(before.rotationalPower, 8);
    s.edit('budget', 200); expect(values(s)).toEqual(slower);
  });
  it.each(BENCHES)('compares $id hand and load advance per turn on one proportional scale', b => {
    const s = session(b), before = s.state(), target = expected(b), maximum = Math.max(target.handCircumference, target.loadAdvance);
    expect(s.guide()).toBeTruthy();
    for (const [kind, value] of [['hand', target.handCircumference], ['load', target.loadAdvance]]) {
      const bar = nodes(s.guide()).find(n => n.props?.['data-ml-rotation-bar'] === kind); expect(bar).toBeTruthy();
      expect(parseFloat(bar.props.style.width)).toBeCloseTo(value / maximum * 100, 10); expect(bar.props.style.minWidth ?? 0).toBe(0);
    }
    expect(text(s.guide())).not.toMatch(/NaN|Infinity/); expect(s.state()).toBe(before); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('retains a fractional turn and uses radians rather than turn count in work', () => {
    const b = BENCHES[0], s = session(b), target = expected(b); expect(target.turns).toBeLessThan(1); expect(values(s).turns).toBeCloseTo(target.turns, 12);
    answer(s, SKILLS[0], 1); expect(s.result()).toBe('incorrect'); s.edit('answer', target.turns); s.click('check'); expect(s.result()).toBe('correct');
    answer(s, SKILLS[3], 50 * target.turns); expect(s.result()).toBe('incorrect'); s.edit('answer', 250); s.click('check'); expect(s.result()).toBe('correct');
    for (const q of [SKILLS[3], SKILLS[4]]) { answer(s, q, target[q.id] / 0.8); expect(s.result()).toBe('incorrect'); s.edit('answer', target[q.id]); s.click('check'); expect(s.result()).toBe('correct'); }
  });
  it('keeps all four linear stations at ten skills without a rotation guide', () => {
    for (const bench of ['lever', 'pulley', 'ramp', 'wedge']) {
      const s = session(BENCHES[0], { bench }); expect(s.guide()).toBeUndefined();
      expect(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual([...LINEAR_KINDS, ...PLANNING_KINDS]);
    }
  });
  it('shows rotary practice only in middle and high-school bands', () => {
    for (const bandOverride of ['k2', 'g35', 'g68', 'g912']) {
      const s = session(BENCHES[0], { bandOverride }); expect(!!s.guide()).toBe(['g68', 'g912'].includes(bandOverride));
    }
  });
});

describe('Machine Lab: rotary calculation practice', () => {
  it.each(CASES)('checks and saves $name as a version-3 fixed snapshot', ({ b, q }) => {
    const s = session(b), before = s.state(), target = expected(b)[q.id], entered = String(Number(target.toPrecision(3))); answer(s, q, entered);
    expect(s.result()).toBe('correct'); expect(s.state().benchPowerRecords).toBeUndefined(); s.click('save');
    expect(s.state().benchPowerRecords[b.id][q.id]).toEqual({ version: 3, benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 },
      percent: 80, seconds: 5, budget: 100, question: q.id, answer: entered, unit: q.unit, hint: 0, completion: 'checked' });
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(before[key]);
    const restored = session(b, { view: 'learn', manualTopic: 'record', benchPowerRecords: JSON.parse(JSON.stringify(s.state().benchPowerRecords)) });
    expect(restored.recordRow(q.id)).toBeTruthy(); expect(text(restored.recordRow(q.id))).toMatch(q.words); expect(text(restored.recordRow(q.id))).toContain('Answer checked');
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(SKILLS)('requires the requested $unit for $id', q => {
    const s = session(); answer(s, q, expected(BENCHES[0])[q.id]);
    for (const unit of ['', q.unit === 'rad' ? 'turns' : 'rad']) {
      s.edit('unit', unit); s.click('check'); expect(s.result()).toBe('unit'); expect(s.byId('unit').props['aria-invalid']).toBe(true); expect(s.action('save').props.disabled).toBe(true);
      s.invoke(s.action('save')); expect(s.state().benchPowerRecords).toBeUndefined();
    }
    s.edit('unit', q.unit); s.click('check'); expect(s.result()).toBe('correct');
  });
  it.each(SKILLS)('accepts one-percent rounding and supports a corrected $id attempt', q => {
    const s = session(), target = expected(BENCHES[0])[q.id]; answer(s, q, target * 1.0101); expect(s.result()).toBe('incorrect');
    for (const [scale, result] of [[0.9899, 'incorrect'], [0.9901, 'correct'], [1.0099, 'correct']]) { s.edit('answer', target * scale); expect(s.result()).toBeUndefined(); s.click('check'); expect(s.result()).toBe(result); }
  });
  it.each(SKILLS)('provides two $id hints and retains solution-viewed provenance', q => {
    const s = session(); s.edit('question', q.id);
    for (const level of [1, 2]) { s.click('hint'); const hint = s.find(n => n.props?.['data-ml-power-hint-level'] === level); expect(hint).toBeTruthy(); expect(text(hint)).toMatch(q.words); }
    expect(s.action('hint').props.disabled).toBe(true); expect(s.action('save').props.disabled).toBe(true); s.click('reveal'); s.click('save');
    expect(s.state().benchPowerRecords.windlass[q.id]).toMatchObject({ version: 3, answer: '', unit: '', hint: 2, completion: 'solution' });
    s.edit('answer', expected(BENCHES[0])[q.id]); s.edit('unit', q.unit); s.click('check'); expect(s.result()).toBe('solution'); s.click('save');
    expect(s.state().benchPowerRecords.windlass[q.id].completion).toBe('solution');
  });
  it('converts minutes to seconds in angular speed, power and saved assumptions', () => {
    const s = session(); s.edit('duration', 2); s.edit('timeUnit', 'min'); const target = expected(BENCHES[0], BENCHES[0].settings, 0.5, 80, 120);
    for (const q of [SKILLS[2], SKILLS[4]]) { answer(s, q, target[q.id]); expect(s.result()).toBe('correct'); s.click('save'); expect(s.state().benchPowerRecords.windlass[q.id].seconds).toBe(120); }
  });
  it('rejects missing, negative and nonfinite numerical answers for each new skill', () => {
    const s = session();
    for (const q of SKILLS) { s.edit('question', q.id); s.edit('unit', q.unit); for (const answer of ['', '-1', 'Infinity', 'NaN', 'abc']) {
      s.edit('answer', answer); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.action('save').props.disabled).toBe(true);
    } }
  });
});

describe('Machine Lab: rotary practice state integrity', () => {
  it.each([
    ['station', { bench: 'screw' }], ['view', { view: 'learn' }], ['radius', { windlassHandleR: 0.6 }],
    ['load', { windlassLoad: 800 }], ['movement', { loadDistance: 1 }],
    ['efficiency', { benchPower: { windlass: { percent: '40', question: 'turns' } } }],
    ['time', { benchPower: { windlass: { duration: '10', question: 'turns' } } }],
    ['budget', { benchPower: { windlass: { budget: '200', question: 'turns' } } }]
  ])('rejects delayed rotary handlers after %s changes', (_name, patch) => {
    const s = session(); answer(s, SKILLS[0], expected(BENCHES[0]).turns); const actions = ['check', 'hint', 'reveal', 'save', 'next'].map(s.action), input = s.byId('answer');
    s.patch(patch); const before = s.state(); actions.forEach(s.invoke); input.props.onChange({ target: { value: '999' } }); expect(s.state()).toBe(before); expect(s.state().benchPowerRecords).toBeUndefined();
  });
  it('offers seventeen rotary skills and cycles the five new skills back to input power', () => {
    for (const b of BENCHES) {
      const s = session(b); expect(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual(ROTARY_KINDS); s.edit('question', 'turns');
      for (let index = 0; index < SKILLS.length; index++) { expect(s.byId('question').props.value).toBe(SKILLS[index].id); s.edit('answer', '123'); s.edit('unit', 'W'); s.click('hint'); s.click('reveal'); s.click('next');
        expect(s.byId('question').props.value).toBe(SKILLS[index + 1]?.id || 'inputPower'); expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined(); }
      expect(s.state().benchPowerRecords).toBeUndefined();
    }
  });
  it('never restores an old checked answer after editing it or moving to another skill', () => {
    const s = session(); answer(s, SKILLS[0], expected(BENCHES[0]).turns); const save = s.action('save'); s.edit('answer', 99); s.invoke(save); expect(s.state().benchPowerRecords).toBeUndefined();
    answer(s, SKILLS[0], expected(BENCHES[0]).turns); const secondSave = s.action('save'); s.click('next'); const before = s.state(); s.invoke(secondSave); expect(s.state()).toBe(before); expect(s.state().benchPowerRecords).toBeUndefined();
  });
  it('removes rotation metrics and grading when assumptions or geometry are invalid', () => {
    for (const [field, value] of [['percent', 0], ['percent', 100.1], ['duration', 0], ['duration', 3601], ['budget', 0]]) {
      const s = session(); s.edit('question', 'omega'); s.edit(field, value); expect(s.guide()).toBeUndefined(); expect(s.action('check')).toBeUndefined();
    }
    const s = session(); s.patch({ windlassHandleR: 0 }); expect(s.guide()).toBeUndefined(); expect(s.action('check')).toBeUndefined();
  });
});

describe('Machine Lab: verifiable rotary records', () => {
  it.each(SKILLS)('requires version 3 and verifies the arithmetic and unit of a saved $id record', q => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record' });
    for (const patch of [{ version: 1 }, { version: 2 }, { answer: '999999' }, { unit: q.unit === 'rad' ? 'turns' : 'rad' }]) {
      s.patch({ benchPowerRecords: { windlass: { [q.id]: record(q, patch) } } }); expect(s.recordRow(q.id)).toBeUndefined();
    }
    s.patch({ benchPowerRecords: { windlass: { [q.id]: record(q) } } }); expect(s.recordRow(q.id)).toBeTruthy();
  });
  it.each([
    ['missing geometry', { settings: { windlassLoad: 400 } }], ['string efficiency', { percent: '80' }],
    ['zero duration', { seconds: 0 }], ['out-of-range budget', { budget: 100001 }], ['invalid unit', { unit: 'degrees' }],
    ['invalid hint', { hint: 3 }], ['invalid completion', { completion: 'passed' }]
  ])('omits a rotary record with %s', (_name, patch) => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', benchPowerRecords: { windlass: { turns: record(SKILLS[0], patch) } } }); expect(s.recordRow('turns')).toBeUndefined();
  });
  it('keeps v1 and v2 work readable and retains new distractor units only for honest viewed solutions', () => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record' });
    for (const [version, question, answer, unit] of [[1, 'inputPower', '50', 'W'], [1, 'rpm', String(expected(BENCHES[0]).turns / 5 * 60), 'rpm'], [2, 'budgetEnergy', '500', 'J']]) {
      const old = record(SKILLS[0], { version, question, answer, unit }); s.patch({ benchPowerRecords: { windlass: { [question]: old } } }); expect(s.recordRow(question)).toBeTruthy();
      for (const distractor of ['turns', 'rad', 'rad/s']) {
        s.patch({ benchPowerRecords: { windlass: { [question]: { ...old, completion: 'solution', unit: distractor } } } }); expect(text(s.recordRow(question))).toContain('Worked solution viewed');
        s.patch({ benchPowerRecords: { windlass: { [question]: { ...old, completion: 'checked', unit: distractor } } } }); expect(s.recordRow(question)).toBeUndefined();
      }
      s.patch({ benchPowerRecords: { windlass: { [question]: { ...old, version: 3 } } } }); expect(s.recordRow(question)).toBeUndefined();
    }
  });
  it('saves all five rotary skills beside old work and replaces only explicitly saved work', () => {
    const old = record(SKILLS[0], { version: 1, question: 'inputPower', answer: '50', unit: 'W' }), other = { note: 'preserved' };
    const s = session(BENCHES[0], { benchPowerRecords: { windlass: { inputPower: old }, screw: other } });
    for (const q of SKILLS) { answer(s, q, expected(BENCHES[0])[q.id]); s.click('save'); }
    const first = s.state().benchPowerRecords.windlass, retained = first.turns; s.patch({ windlassLoad: 800, loadDistance: 1 });
    expect(s.state().benchPowerRecords.windlass).toBe(first); answer(s, SKILLS[3], 1000); s.click('save');
    expect(s.state().benchPowerRecords.windlass.turns).toBe(retained); expect(retained.settings.loadDistance).toBe(0.5); expect(retained.settings.windlassLoad).toBe(400);
    expect(s.state().benchPowerRecords.windlass.inputPower).toBe(old); expect(s.state().benchPowerRecords.screw).toBe(other);
    expect(Object.keys(s.state().benchPowerRecords.windlass).sort()).toEqual(['inputPower', ...SKILLS.map(q => q.id)].sort());
  });
  it('rejects rotary records on a linear station even when solution viewing bypasses arithmetic grading', () => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', bench: 'lever' });
    for (const q of SKILLS) {
      const invalid = record(q, { benchId: 'lever', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400, loadDistance: 0.5 }, completion: 'solution' });
      s.patch({ benchPowerRecords: { lever: { [q.id]: invalid } } }); expect(s.find(n => n.props?.['data-ml-power-record-station'] === 'lever')).toBeUndefined();
    }
  });
  it('exports fixed torque work with escaped input and honest solution provenance', async () => {
    const saved = record(SKILLS[3], { answer: '<script>literal</script>', unit: 'rad', hint: 2, completion: 'solution', rotationalWork: 8675309 });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', windlassLoad: 900, windlassDrumR: 0.2, benchPowerRecords: { windlass: { rotationalWork: saved } } });
    const evidence = text(s.recordRow('rotationalWork')); for (const snippet of ['400 N', '250 J', '5 s', 'Worked solution viewed', 'Hints opened: 2/2']) expect(evidence).toContain(snippet);
    expect(evidence).not.toContain('8675309'); expect(s.html()).not.toContain('<script>literal</script>');
    const write = vi.fn(async () => true), descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard'); window.StemLab.writeClipboard = write;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try { s.refresh(); s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve(); expect(write).toHaveBeenCalledOnce();
      for (const snippet of ['400 N', '250 J', 'Worked solution viewed', saved.answer]) expect(write.mock.calls[0][0]).toContain(snippet); expect(s.state().benchPowerRecords.windlass.rotationalWork).toBe(saved);
    } finally { if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else delete navigator.clipboard; }
  });
});
