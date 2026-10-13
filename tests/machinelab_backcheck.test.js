import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const CONVERSIONS = ['powerKilowatts', 'powerWatts', 'timeMinutes', 'timeSeconds', 'speedCentimetres', 'speedMetres'];
const ROTATION = ['turns', 'angularTravel', 'omega', 'rotationalWork', 'rotationalPower'];
const PLANNING = ['budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'];
const FORCES = ['effortFromPower', 'loadFromPower'];
const rotary = b => ['windlass', 'screw'].includes(b.id);
function kinds(b) { return ['inputPower', 'usefulPower', 'lossPower', 'handSpeed', 'loadSpeed', 'budgetTime']
  .concat(rotary(b) ? ['torque', 'rpm'] : [], PLANNING, rotary(b) ? ROTATION : [], FORCES, CONVERSIONS); }
function version(kind) { return CONVERSIONS.includes(kind) ? 5 : FORCES.includes(kind) ? 4 : ROTATION.includes(kind) ? 3 : PLANNING.includes(kind) ? 2 : 1; }

// Independent geometry and SI identities: never derive expectations from tool output,
// internal math helpers, displayed targets or stored source strings.
function expected(b, d = BASE, percent = 80, seconds = 5, budget = 100) {
  const eta = percent / 100, force = d[b.load], distance = d.loadDistance, ma = b.ma(d);
  const work = force * distance, input = work / eta, travel = distance * ma;
  const handSpeed = travel / seconds, loadSpeed = distance / seconds, watts = input / seconds;
  const available = budget * seconds, usefulAvailable = available * eta;
  const q = (target, unit, reference, referenceUnit, undo) => ({ target, unit, reference, referenceUnit, undo });
  const specs = {
    inputPower: q(watts, 'W', work, 'J', a => a * seconds * eta),
    usefulPower: q(work / seconds, 'W', work, 'J', a => a * seconds),
    lossPower: q((input - work) / seconds, 'W', input - work, 'J', a => a * seconds),
    handSpeed: q(handSpeed, 'm/s', travel, 'm', a => a * seconds),
    loadSpeed: q(loadSpeed, 'm/s', distance, 'm', a => a * seconds),
    budgetTime: q(input / budget, 's', work, 'J', a => a * budget * eta),
    budgetEnergy: q(available, 'J', budget, 'W', a => a / seconds),
    budgetLoad: q(usefulAvailable / distance, 'N', usefulAvailable, 'J', a => a * distance),
    budgetMovement: q(usefulAvailable / force, 'm', usefulAvailable, 'J', a => a * force),
    requiredEfficiency: q(work / available * 100, '%', work, 'J', a => a / 100 * budget * seconds),
    effortFromPower: q(force / ma / eta, 'N', watts, 'W', a => a * handSpeed),
    loadFromPower: q(force, 'N', work / seconds, 'W', a => a * loadSpeed),
    powerKilowatts: q(watts / 1000, 'kW', watts, 'W', a => a * 1000),
    powerWatts: q(watts, 'W', watts / 1000, 'kW', a => a / 1000),
    timeMinutes: q(seconds / 60, 'min', seconds, 's', a => a * 60),
    timeSeconds: q(seconds, 's', seconds / 60, 'min', a => a / 60),
    speedCentimetres: q(handSpeed * 100, 'cm/s', handSpeed, 'm/s', a => a / 100),
    speedMetres: q(handSpeed, 'm/s', handSpeed * 100, 'cm/s', a => a * 100)
  };
  if (rotary(b)) {
    const radius = b.id === 'screw' ? d.screwHandleR : d.windlassHandleR;
    const advance = b.id === 'screw' ? d.screwPitch : 2 * Math.PI * d.windlassDrumR;
    const turns = distance / advance, angle = turns * 2 * Math.PI, rpm = turns * 60 / seconds;
    const omega = angle / seconds, torque = force / ma / eta * radius;
    Object.assign(specs, {
      torque: q(torque, 'N·m', force, 'N', a => a / radius * ma * eta),
      rpm: q(rpm, 'rpm', distance, 'm', a => a * seconds / 60 * advance),
      turns: q(turns, 'turns', distance, 'm', a => a * advance),
      angularTravel: q(angle, 'rad', turns, 'turns', a => a / (2 * Math.PI)),
      omega: q(omega, 'rad/s', rpm, 'rpm', a => a * 60 / (2 * Math.PI)),
      rotationalWork: q(torque * angle, 'J', angle, 'rad', a => a / torque),
      rotationalPower: q(torque * omega, 'W', omega, 'rad/s', a => a / torque)
    });
  }
  return specs;
}
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ otherTool: { note: 'Keep other work' }, machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate), byId = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const action = key => find(n => n.type === 'button' && n.props[`data-ml-power-${key}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { b, render, find, byId, action, invoke, awardXP, tryAward, state: () => store.toolData.machineLab, allState: () => store.toolData,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: key => invoke(action(key)), backcheck: () => find(n => n.props?.['data-ml-power-backcheck'] === store.toolData.machineLab.bench),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'] };
}
function answer(s, kind, q, value = q.target, unit = q.unit) {
  s.edit('question', kind); s.edit('answer', value); s.edit('unit', unit); s.click('check');
}
function close(actual, want) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - want)).toBeLessThanOrEqual(Math.max(1e-12, Math.abs(want) * 1e-11));
}
function expectBackcheck(s, kind, q, candidate, provenance = 'checked') {
  const before = s.allState(), detail = s.backcheck();
  expect(detail?.type).toBe('details'); expect(detail.props.open).not.toBe(true);
  expect(detail.props).toMatchObject({ 'data-skill': kind, 'data-provenance': provenance });
  expect(nodes(s.render()).filter(n => n.props?.role === 'status' || n.props?.['aria-live']).some(n => nodes(n).includes(detail))).toBe(false);
  const all = nodes(detail), answerNode = all.find(n => n.props?.['data-ml-power-backcheck-answer'] !== undefined);
  expect(answerNode?.props['data-unit']).toBe(q.unit); close(Number(answerNode.props['data-value']), candidate);
  const equation = all.find(n => n.props?.['data-ml-power-backcheck-equation'] !== undefined);
  expect(text(equation).length).toBeGreaterThan(8);
  const restored = q.undo(candidate), reference = q.reference;
  const metrics = all.filter(n => n.props?.['data-ml-power-backcheck-metric']);
  expect(metrics.map(n => n.props['data-ml-power-backcheck-metric']).sort()).toEqual(['difference', 'reference', 'restored']);
  for (const [key, want] of Object.entries({ restored, reference, difference: Math.abs(restored - reference) })) {
    const metric = metrics.find(n => n.props['data-ml-power-backcheck-metric'] === key);
    expect(metric.props['data-unit']).toBe(q.referenceUnit); close(Number(metric.props['data-value']), want);
    if (key !== 'difference') expect(metric.props.children.map(n => n.type)).toEqual(['dt', 'dd']);
  }
  const bars = all.filter(n => n.props?.['data-ml-power-backcheck-bar']);
  expect(bars.map(n => n.props['data-ml-power-backcheck-bar']).sort()).toEqual(['reference', 'restored']);
  const max = Math.max(restored, reference);
  for (const bar of bars) {
    const value = bar.props['data-ml-power-backcheck-bar'] === 'restored' ? restored : reference;
    close(Number(bar.props['data-value']), value);
    close(Number.parseFloat(bar.props.style.width), max === 0 ? 0 : value / max * 100);
    expect([undefined, 0, '0', '0px']).toContain(bar.props.style.minWidth);
    expect(all.some(n => String(n.props?.['aria-hidden']) === 'true' && nodes(n).includes(bar))).toBe(true);
  }
  expect(text(detail)).not.toMatch(/NaN|Infinity|undefined/);
  expect(all.filter(n => ['input', 'button', 'select'].includes(n.type))).toHaveLength(0);
  expect(detail.props.onToggle).toBeUndefined(); expect(s.allState()).toBe(before);
  expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
}

describe('Machine Lab: back-check arithmetic', () => {
  it.each(BENCHES)('restores every $id skill through an independent inverse identity', b => {
    const s = session(b), specs = expected(b), ordered = kinds(b);
    expect(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual(ordered);
    expect(ordered).toHaveLength(rotary(b) ? 25 : 18);
    for (const kind of ordered) { answer(s, kind, specs[kind]); expect(s.result()).toBe('correct'); expectBackcheck(s, kind, specs[kind], specs[kind].target); }
  });
  it.each(BENCHES)('uses accepted entered values for all $id skills instead of replacing them with exact targets', b => {
    const s = session(b), specs = expected(b);
    for (const kind of kinds(b)) {
      const q = specs[kind], entered = Number((q.target * 1.005).toPrecision(12));
      answer(s, kind, q, entered); expect(s.result()).toBe('correct'); expectBackcheck(s, kind, q, entered);
      expect(Number(s.find(n => n.props?.['data-ml-power-backcheck-metric'] === 'difference').props['data-value'])).toBeGreaterThan(0);
    }
  });
  it.each(BENCHES.filter(rotary))('retains correct rotary inverse units for non-default $id geometry', b => {
    const settings = { ...BASE, windlassHandleR: 0.6, windlassDrumR: 0.15, screwHandleR: 0.2, screwPitch: 0.012, loadDistance: 0.7 };
    const s = session(b, settings), specs = expected(b, settings, 37.5, 12.5, 230);
    s.edit('percent', 37.5); s.edit('duration', 12.5); s.edit('budget', 230);
    for (const kind of ['torque', 'rpm', ...ROTATION]) { answer(s, kind, specs[kind]); expect(s.result()).toBe('correct'); expectBackcheck(s, kind, specs[kind], specs[kind].target); }
  });
  it('uses vertical rise rather than ramp path length and distinguishes hand travel', () => {
    const b = BENCHES[2], s = session(b), specs = expected(b);
    for (const kind of ['loadSpeed', 'handSpeed', 'budgetMovement', 'loadFromPower']) { answer(s, kind, specs[kind]); expectBackcheck(s, kind, specs[kind], specs[kind].target); }
    expect(specs.loadSpeed.reference).toBe(0.5); expect(specs.handSpeed.reference).toBe(2);
  });
  it('normalizes entered minutes once before every inverse calculation', () => {
    const b = BENCHES[4], s = session(b), specs = expected(b, BASE, 80, 120);
    s.edit('duration', 2); s.edit('timeUnit', 'min');
    for (const kind of kinds(b)) { answer(s, kind, specs[kind]); expect(s.result()).toBe('correct'); expectBackcheck(s, kind, specs[kind], specs[kind].target); }
  });
  it('retains an impossible required efficiency above 100 percent without clamping its inverse', () => {
    const b = BENCHES[5], s = session(b), q = expected(b).requiredEfficiency;
    expect(q.target).toBe(200); answer(s, 'requiredEfficiency', q); expect(s.result()).toBe('correct'); expectBackcheck(s, 'requiredEfficiency', q, 200);
    const budget = 199.999999999999, near = expected(b, BASE, 80, 5, budget).requiredEfficiency; s.edit('budget', budget);
    expect(near.target).toBeGreaterThan(100); expect(near.target).toBeLessThan(100.000001);
    answer(s, 'requiredEfficiency', near); expect(s.result()).toBe('correct'); expectBackcheck(s, 'requiredEfficiency', near, near.target);
    expect(text(s.find(n => n.props?.['data-ml-power-backcheck-answer'] !== undefined))).toContain(String(near.target) + ' %');
  });
});

describe('Machine Lab: back-check provenance', () => {
  it.each(BENCHES)('uses the worked target for $id even when an unfinished draft is present', b => {
    const s = session(b), specs = expected(b);
    for (const [kind, entered, unit] of [['inputPower', '', ''], ['handSpeed', 'wrong', 'm/s'], ['budgetLoad', '-1', 'N'],
      ['requiredEfficiency', '999999', '%'], ['timeMinutes', '0', 'W'], ['powerKilowatts', 'Infinity', 'J']]) {
      s.edit('question', kind); s.edit('answer', entered); s.edit('unit', unit); s.click('reveal');
      expect(s.result()).toBe('solution'); expectBackcheck(s, kind, specs[kind], specs[kind].target, 'solution');
      expect(s.byId('answer').props.value).toBe(entered); expect(s.byId('unit').props.value).toBe(unit);
    }
    expect(s.state().benchPowerRecords).toBeUndefined();
  });
  it('keeps solution provenance after a previously checked rounded answer is revealed and checked again', () => {
    const s = session(), q = expected(BENCHES[0]).inputPower;
    answer(s, 'inputPower', q, 50.25); expectBackcheck(s, 'inputPower', q, 50.25);
    s.click('reveal'); expectBackcheck(s, 'inputPower', q, q.target, 'solution');
    s.click('check'); expect(s.result()).toBe('solution'); expectBackcheck(s, 'inputPower', q, q.target, 'solution');
    expect(s.byId('answer').props.value).toBe('50.25');
  });
  it('does not save on render or change snapshots, versions, other tools, notes or XP', () => {
    const b = BENCHES[4], otherStation = { question: 'turns', answer: 'keep' }, s = session(b, { benchPower: { screw: otherStation }, designReflection: 'Keep reflection' });
    const specs = expected(b), originalOther = s.allState().otherTool;
    for (const kind of ['inputPower', 'budgetEnergy', 'turns', 'effortFromPower', 'powerKilowatts']) {
      answer(s, kind, specs[kind]); const before = s.allState(); expectBackcheck(s, kind, specs[kind], specs[kind].target);
      expect(s.allState()).toBe(before); expect(s.state().benchPowerRecords?.windlass?.[kind]).toBeUndefined();
      s.click('save'); const record = s.state().benchPowerRecords.windlass[kind];
      expect(record.version).toBe(version(kind)); expect(record.completion).toBe('checked'); expect(record.answer).toBe(String(specs[kind].target));
      expect(Object.keys(record).sort()).toEqual(['answer', 'benchId', 'budget', 'completion', 'hint', 'percent', 'question', 'seconds', 'settings', 'unit', 'version']);
    }
    expect(s.allState().otherTool).toBe(originalOther); expect(s.state().benchPower.screw).toBe(otherStation); expect(s.state().designReflection).toBe('Keep reflection');
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
});

describe('Machine Lab: back-check visibility', () => {
  it.each(['unchecked', 'first hint', 'second hint', 'invalid', 'unit', 'incorrect'])('does not disclose a back-check for %s work', mode => {
    const s = session(); s.edit('answer', mode === 'invalid' ? 'not a number' : mode === 'incorrect' ? '999' : '50');
    s.edit('unit', mode === 'unit' ? 'J' : 'W');
    if (mode.includes('hint')) s.click('hint'); if (mode === 'second hint') s.click('hint');
    if (['invalid', 'unit', 'incorrect'].includes(mode)) { s.click('check'); expect(s.result()).toBe(mode); }
    expect(s.backcheck()).toBeUndefined(); expect(s.state().benchPowerRecords).toBeUndefined();
  });
  it('retains grade-band and valid-model gates', () => {
    for (const bandOverride of ['k2', 'g35']) expect(session(BENCHES[0], { bandOverride }).backcheck()).toBeUndefined();
    for (const patch of [{ leverEffortArm: 0 }, { loadDistance: 0 }, { benchPower: { lever: { percent: '0' } } },
      { benchPower: { lever: { duration: '0' } } }, { benchPower: { lever: { budget: '0' } } }]) {
      const s = session(BENCHES[0], patch); expect(s.backcheck()).toBeUndefined(); expect(s.action('check')).toBeUndefined();
    }
    for (const bandOverride of ['g68', 'g912']) {
      const s = session(BENCHES[0], { bandOverride }), q = expected(BENCHES[0]).inputPower; answer(s, 'inputPower', q); expectBackcheck(s, 'inputPower', q, q.target);
    }
  });
  it.each([['answer', '51'], ['unit', 'J'], ['question', 'handSpeed'], ['percent', '40'], ['duration', '10'], ['timeUnit', 'min'], ['budget', '200']])(
    'follows the existing feedback lifecycle when %s changes', (field, value) => {
      for (const reveal of [false, true]) {
        const s = session(), q = expected(BENCHES[0]).inputPower; answer(s, 'inputPower', q); if (reveal) s.click('reveal');
        expect(s.backcheck()).toBeTruthy(); s.edit(field, value);
        if (reveal && ['answer', 'unit'].includes(field)) {
          expect(s.result()).toBe('solution'); expectBackcheck(s, 'inputPower', q, q.target, 'solution');
        } else { expect(s.backcheck()).toBeUndefined(); expect(s.result()).toBeUndefined(); }
      }
    });
  it('invalidates feedback after an external geometry change without replacing the stored record', () => {
    const s = session(), q = expected(BENCHES[0]).inputPower; answer(s, 'inputPower', q); s.click('save'); const saved = s.state().benchPowerRecords;
    s.patch({ leverLoad: 800 }); const before = s.allState(); expect(s.backcheck()).toBeUndefined(); expect(s.result()).toBeUndefined();
    expect(s.state().benchPowerRecords).toBe(saved); expect(s.allState()).toBe(before);
  });
  it('does not leak feedback into another station or the learning record view', () => {
    const s = session(), q = expected(BENCHES[0]).inputPower; answer(s, 'inputPower', q); expect(s.backcheck()).toBeTruthy();
    s.patch({ bench: 'screw' }); expect(s.backcheck()).toBeUndefined();
    s.patch({ bench: 'lever', view: 'learn', manualTopic: 'record' }); expect(s.backcheck()).toBeUndefined();
  });
});

describe('Machine Lab: back-check numerical bounds', () => {
  it('keeps both zero-loss bars empty and represents a tiny accepted nonzero answer honestly', () => {
    const s = session(), q = expected(BENCHES[0], BASE, 100).lossPower; s.edit('percent', 100);
    for (const candidate of [0, 1e-11]) {
      answer(s, 'lossPower', q, candidate === 0 ? '0' : '0.00000000001');
      expect(s.result()).toBe('correct'); expectBackcheck(s, 'lossPower', q, candidate);
    }
    expect(Number(s.find(n => n.props?.['data-ml-power-backcheck-metric'] === 'reference').props['data-value'])).toBe(0);
  });
  it('keeps a near-zero loss reference nonzero when the existing absolute tolerance accepts zero', () => {
    const s = session(), percent = 99.99999999999, q = expected(BENCHES[0], BASE, percent).lossPower;
    expect(q.target).toBeGreaterThan(0); expect(q.target).toBeLessThan(1e-10); s.edit('percent', percent);
    answer(s, 'lossPower', q, 0); expect(s.result()).toBe('correct'); expectBackcheck(s, 'lossPower', q, 0);
    expect(Number(s.find(n => n.props?.['data-ml-power-backcheck-metric'] === 'reference').props['data-value'])).toBeGreaterThan(0);
  });
  it('preserves very small conversion quantities without introducing the older absolute tolerance floor', () => {
    const b = BENCHES[0], settings = { ...BASE, leverLoad: 50, leverEffortArm: 0.2, leverLoadArm: 4, loadDistance: 0.1 };
    const s = session(b, settings), specs = expected(b, settings, 100, 3600); s.edit('percent', 100); s.edit('duration', 3600);
    for (const kind of ['powerKilowatts', 'speedMetres']) {
      const q = specs[kind]; expect(q.target).toBeLessThan(0.00001); answer(s, kind, q, 0); expect(s.result()).toBe('incorrect'); expect(s.backcheck()).toBeUndefined();
      const entered = Number(q.target.toPrecision(3)); answer(s, kind, q, entered); expect(s.result()).toBe('correct'); expectBackcheck(s, kind, q, entered);
    }
  });
});
