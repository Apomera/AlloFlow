import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// All expected forces and rates come from independent geometry, not production helpers.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const SKILLS = [{ id: 'effortFromPower', metric: 'inputForce' }, { id: 'loadFromPower', metric: 'loadForce' }];
const CASES = BENCHES.flatMap(b => SKILLS.map(q => ({ b, q, name: `${b.id}/${q.id}` })));
const PAIRS = [['inputForce', 'loadForce'], ['handSpeed', 'loadSpeed'], ['inputPower', 'usefulPower']];
function expected(b, d = BASE, percent = 80, seconds = 5) {
  const load = d[b.load], ratio = b.ma(d), movement = d.loadDistance, eta = percent / 100;
  return { inputForce: load / ratio / eta, loadForce: load, handSpeed: movement * ratio / seconds,
    loadSpeed: movement / seconds, inputPower: load * movement / eta / seconds, usefulPower: load * movement / seconds };
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
    guide: () => find(n => n.props?.['data-ml-power-force-speed'] === store.toolData.machineLab.bench),
    metric: key => find(n => n.props?.['data-ml-power-motion-metric'] === key),
    skill: key => find(n => n.props?.['data-ml-power-skill'] === key),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    recordRow: question => find(n => n.props?.['data-ml-power-record-station'] === b.id && n.props?.['data-ml-power-record-skill'] === question),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q, value) { s.edit('question', q.id); s.edit('answer', value); s.edit('unit', 'N'); s.click('check'); }
function values(s) { return Object.fromEntries(PAIRS.flat().map(k => [k, Number(s.metric(k).props['data-value'])])); }
function record(q = SKILLS[0], b = BENCHES[0], extra = {}) {
  return { version: 4, benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, percent: 80, seconds: 5, budget: 100,
    question: q.id, answer: String(expected(b)[q.metric]), unit: 'N', hint: 0, completion: 'checked', ...extra };
}

describe('Machine Lab: force speed equations and guide', () => {
  it.each(BENCHES)('derives six $id quantities and proportional paired bars at legal assumption endpoints', b => {
    const s = session(b);
    for (const [percent, seconds] of [[80, 5], [1, 0.01], [100, 3600], [37.5, 12.5]]) {
      s.edit('percent', percent); s.edit('duration', seconds); const before = s.state(), target = expected(b, BASE, percent, seconds), actual = values(s);
      expect(s.guide()?.type).toBe('details'); expect(s.guide().props.open).not.toBe(true);
      for (const [key, value] of Object.entries(target)) expect(actual[key], key).toBeCloseTo(value, 7);
      expect(actual.inputForce * actual.handSpeed).toBeCloseTo(actual.inputPower, 7);
      expect(actual.loadForce * actual.loadSpeed).toBeCloseTo(actual.usefulPower, 7);
      for (const pair of PAIRS) for (const key of pair) {
        const bar = nodes(s.guide()).find(n => n.props?.['data-ml-power-motion-bar'] === key);
        expect(bar, key).toBeTruthy(); expect(parseFloat(bar.props.style.width), key).toBeCloseTo(target[key] / Math.max(...pair.map(k => target[k])) * 100, 10);
        expect(bar.props.style.minWidth ?? 0).toBe(0);
      }
      expect(text(s.guide())).not.toMatch(/NaN|Infinity/); expect(s.state()).toBe(before);
    }
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(BENCHES)('separates $id force from rate and rejects mixed-side or repeated-efficiency calculations', b => {
    const s = session(b), first = values(s); s.edit('duration', 10); const slower = values(s);
    for (const key of ['inputForce', 'loadForce']) expect(slower[key]).toBeCloseTo(first[key], 10);
    for (const key of ['handSpeed', 'loadSpeed', 'inputPower', 'usefulPower']) expect(slower[key]).toBeCloseTo(first[key] / 2, 10);
    s.edit('percent', 40); const inefficient = values(s);
    expect(inefficient.inputForce).toBeCloseTo(first.inputForce * 2, 10); expect(inefficient.loadForce).toBe(first.loadForce);
    expect(inefficient.handSpeed).toBe(slower.handSpeed); expect(inefficient.loadSpeed).toBe(slower.loadSpeed);
    answer(s, SKILLS[0], inefficient.usefulPower / inefficient.handSpeed); expect(s.result()).toBe('incorrect');
    answer(s, SKILLS[0], inefficient.inputPower / inefficient.handSpeed / 0.4); expect(s.result()).toBe('incorrect');
    answer(s, SKILLS[0], inefficient.inputForce); expect(s.result()).toBe('correct');
    answer(s, SKILLS[1], inefficient.inputPower / inefficient.loadSpeed); expect(s.result()).toBe('incorrect');
    answer(s, SKILLS[1], inefficient.loadForce); expect(s.result()).toBe('correct');
  });
  it('hides the guide and practice when assumptions or station geometry are invalid', () => {
    for (const patch of [{ leverEffortArm: 0 }, { benchPower: { lever: { percent: '0' } } }, { benchPower: { lever: { duration: '0' } } }]) {
      const s = session(BENCHES[0], patch); expect(s.guide()).toBeUndefined(); expect(s.action('check')).toBeUndefined();
    }
    for (const bandOverride of ['k2', 'g35', 'g68', 'g912']) expect(!!session(BENCHES[0], { bandOverride }).guide()).toBe(['g68', 'g912'].includes(bandOverride));
  });
  it('labels ramp output as vertical rise and correctly reverses a sub-one lever force comparison', () => {
    const ramp = session(BENCHES[2]); expect(text(ramp.guide())).toMatch(/vertical rise/i);
    answer(ramp, SKILLS[1], expected(BENCHES[2]).usefulPower / expected(BENCHES[2]).handSpeed); expect(ramp.result()).toBe('incorrect');
    answer(ramp, SKILLS[1], 400); expect(ramp.result()).toBe('correct');
    const lever = session(BENCHES[0], { leverEffortArm: 0.5, leverLoadArm: 2 }), actual = values(lever);
    expect(actual.inputForce).toBe(2000); expect(actual.loadForce).toBe(400); expect(actual.handSpeed).toBe(0.025);
    const forceBars = PAIRS[0].map(k => nodes(lever.guide()).find(n => n.props?.['data-ml-power-motion-bar'] === k));
    expect(forceBars.map(n => parseFloat(n.props.style.width))).toEqual([100, 20]);
  });
});

describe('Machine Lab: force speed calculation practice', () => {
  it.each(CASES)('checks and saves $name as a version-4 fixed snapshot with its selected skill card', ({ b, q }) => {
    const s = session(b), before = s.state(), entered = String(Number(expected(b)[q.metric].toPrecision(3)));
    s.invoke(s.skill(q.id)); expect(s.byId('question').props.value).toBe(q.id); expect(s.skill(q.id).props['aria-pressed']).toBe(true);
    answer(s, q, entered); expect(s.result()).toBe('correct'); expect(s.state().benchPowerRecords).toBeUndefined(); s.click('save');
    expect(s.state().benchPowerRecords[b.id][q.id]).toEqual(record(q, b, { answer: entered }));
    expect(s.skill(q.id).props['data-ml-power-skill-status']).toBe('checked'); expect(s.skill(q.id).props['data-ml-power-skill-setup']).toBe('current');
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(before[key]);
    const restored = session(b, { view: 'learn', manualTopic: 'record', benchPowerRecords: JSON.parse(JSON.stringify(s.state().benchPowerRecords)) });
    expect(text(restored.recordRow(q.id))).toContain('Answer checked'); expect(text(restored.recordRow(q.id))).toContain(' N');
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(SKILLS)('requires newtons for $id and refuses a forged disabled save', q => {
    const s = session(); answer(s, q, expected(BENCHES[0])[q.metric]);
    for (const unit of ['', 'W', 'm/s', 'N·m']) {
      s.edit('unit', unit); s.click('check'); expect(s.result()).toBe('unit'); expect(s.byId('unit').props['aria-invalid']).toBe(true);
      expect(text(s.find(n => n.props?.['data-ml-power-result'] === 'unit'))).toMatch(/N.*force|force.*N/);
      expect(s.action('save').props.disabled).toBe(true); s.invoke(s.action('save')); expect(s.state().benchPowerRecords).toBeUndefined();
    }
    s.edit('unit', 'N'); s.click('check'); expect(s.result()).toBe('correct');
  });
  it.each(SKILLS)('retains two $id hints and honest viewed-solution provenance', q => {
    const s = session(); s.edit('question', q.id);
    for (const level of [1, 2]) { s.click('hint'); const hint = s.find(n => n.props?.['data-ml-power-hint-level'] === level); expect(hint).toBeTruthy(); expect(text(hint)).toMatch(/power|force/i); }
    expect(s.action('hint').props.disabled).toBe(true); expect(s.action('save').props.disabled).toBe(true); s.click('reveal'); s.click('save');
    expect(s.state().benchPowerRecords.lever[q.id]).toMatchObject({ version: 4, answer: '', unit: '', hint: 2, completion: 'solution' });
    s.edit('answer', expected(BENCHES[0])[q.metric]); s.edit('unit', 'N'); s.click('check'); expect(s.result()).toBe('solution'); s.click('save');
    expect(s.state().benchPowerRecords.lever[q.id].completion).toBe('solution'); expect(s.skill(q.id).props['data-ml-power-skill-status']).toBe('solution');
  });
  it.each(SKILLS)('checks one-percent $id rounding without accepting the neighboring outside value', q => {
    const s = session(), target = expected(BENCHES[0])[q.metric]; answer(s, q, target * 1.0101); expect(s.result()).toBe('incorrect');
    const retry = text(s.find(n => n.props?.['data-ml-power-result'] === 'incorrect')); expect(retry).toMatch(/power/i); expect(retry).toMatch(/speed|rate/i);
    for (const [scale, result] of [[0.9899, 'incorrect'], [0.9901, 'correct'], [1.0099, 'correct']]) { s.edit('answer', target * scale); expect(s.result()).toBeUndefined(); s.click('check'); expect(s.result()).toBe(result); }
  });
});

describe('Machine Lab: force speed guarded state', () => {
  it.each([
    ['station', { bench: 'screw' }], ['view', { view: 'learn' }], ['geometry', { leverEffortArm: 0.5 }],
    ['assumptions', { benchPower: { lever: { percent: '40', question: 'effortFromPower' } } }], ['question', { benchPower: { lever: { question: 'loadFromPower' } } }]
  ])('rejects delayed force handlers after %s changes', (_name, patch) => {
    const s = session(); answer(s, SKILLS[0], 250); const actions = ['check', 'hint', 'reveal', 'save', 'next'].map(s.action), input = s.byId('answer'), card = s.skill('loadFromPower');
    s.patch(patch); const before = s.state(); actions.forEach(s.invoke); s.invoke(card); input.props.onChange({ target: { value: '999' } });
    expect(s.state()).toBe(before); expect(s.state().benchPowerRecords).toBeUndefined();
  });
  it('appends the two skills across 86 station combinations and wraps from load force to input power', () => {
    let count = 0;
    for (const b of BENCHES) {
      const s = session(b), kinds = nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value); count += kinds.length;
      expect(kinds.slice(-8, -6)).toEqual(SKILLS.map(q => q.id)); s.edit('question', kinds[kinds.length - 9]); s.click('next');
      for (let i = 0; i < SKILLS.length; i++) { expect(s.byId('question').props.value).toBe(SKILLS[i].id); s.edit('answer', '123'); s.edit('unit', 'W'); s.click('hint'); s.click('reveal'); s.click('next');
        expect(s.byId('question').props.value).toBe(SKILLS[i + 1]?.id || 'powerKilowatts'); expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined(); }
      expect(s.state().benchPowerRecords).toBeUndefined();
    }
    expect(count).toBe(122);
  });
});

describe('Machine Lab: verifiable force speed records', () => {
  it('renders v1 through v4 together without changing old version contracts', () => {
    const b = BENCHES[4], saved = {
      inputPower: record(SKILLS[0], b, { version: 1, question: 'inputPower', answer: '50', unit: 'W' }),
      budgetEnergy: record(SKILLS[0], b, { version: 2, question: 'budgetEnergy', answer: '500', unit: 'J' }),
      turns: record(SKILLS[0], b, { version: 3, question: 'turns', answer: String(0.5 / (2 * Math.PI * 0.1)), unit: 'turns' }),
      ...Object.fromEntries(SKILLS.map(q => [q.id, record(q, b)]))
    };
    const s = session(b, { view: 'learn', manualTopic: 'record', benchPowerRecords: { windlass: saved } });
    for (const [kind, rec] of Object.entries(saved)) {
      expect(s.recordRow(kind)).toBeTruthy(); s.patch({ benchPowerRecords: { windlass: { [kind]: { ...rec, version: rec.version === 4 ? 3 : 4 } } } }); expect(s.recordRow(kind)).toBeUndefined();
      s.patch({ benchPowerRecords: { windlass: saved } });
    }
  });
  it.each(SKILLS)('revalidates $id saved arithmetic, settings, units and provenance', q => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record' });
    for (const patch of [{ version: 1 }, { version: 2 }, { version: 3 }, { answer: '999999' }, { unit: 'W' }, { settings: { leverLoad: 400 } }, { percent: '80' }, { seconds: 0 }, { hint: 3 }, { completion: 'passed' }]) {
      s.patch({ benchPowerRecords: { lever: { [q.id]: record(q, BENCHES[0], patch) } } }); expect(s.recordRow(q.id)).toBeUndefined();
    }
    s.patch({ benchPowerRecords: { lever: { [q.id]: record(q) } } }); expect(s.recordRow(q.id)).toBeTruthy();
    s.patch({ benchPowerRecords: { lever: { [q.id]: record(q, BENCHES[0], { answer: 'wrong draft', unit: 'W', completion: 'solution' }) } } }); expect(text(s.recordRow(q.id))).toContain('Worked solution viewed');
  });
  it('retains a fixed saved setup after minute conversion and geometry changes and escapes record input', () => {
    const b = BENCHES[4], s = session(b, { designReflection: 'Keep this note' }); s.edit('duration', 2); s.edit('timeUnit', 'min');
    answer(s, SKILLS[0], expected(b)[SKILLS[0].metric]); expect(s.result()).toBe('correct'); s.click('save');
    const fixed = s.state().benchPowerRecords.windlass.effortFromPower; expect(fixed.seconds).toBe(120); s.patch({ windlassLoad: 800, loadDistance: 1 });
    expect(s.state().benchPowerRecords.windlass.effortFromPower).toBe(fixed); expect(s.skill('effortFromPower').props['data-ml-power-skill-setup']).toBe('earlier');
    answer(s, SKILLS[1], 800); s.click('save'); expect(s.state().benchPowerRecords.windlass.effortFromPower).toBe(fixed); expect(s.state().designReflection).toBe('Keep this note');
    const viewed = { ...fixed, answer: '<script>literal</script>', unit: 'W', completion: 'solution', hint: 2, inputForce: 8675309 };
    const restored = session(b, { view: 'learn', manualTopic: 'record', windlassLoad: 800, benchPowerRecords: { windlass: { effortFromPower: viewed } } });
    const evidence = text(restored.recordRow('effortFromPower')); expect(evidence).toContain('400 N'); expect(evidence).toContain('120 s'); expect(evidence).toContain('Hints opened: 2/2');
    expect(evidence).not.toContain('8675309'); expect(restored.html()).not.toContain('<script>literal</script>');
  });
  it('rejects missing, negative and nonfinite answers for both force calculations', () => {
    const s = session();
    for (const q of SKILLS) { s.edit('question', q.id); s.edit('unit', 'N'); for (const answer of ['', '-1', 'Infinity', 'NaN', 'abc']) {
      s.edit('answer', answer); s.click('check'); expect(s.result()).toBe('invalid'); expect(s.action('save').props.disabled).toBe(true);
    } }
  });
});
