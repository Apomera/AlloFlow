import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 } },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 } },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 } },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 } },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 } },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 } }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const FAMILIES = {
  power: ['inputPower', 'usefulPower', 'lossPower', 'effortFromPower', 'loadFromPower'],
  motion: ['handSpeed', 'loadSpeed'],
  planning: ['budgetTime', 'budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'],
  rotation: ['torque', 'rpm', 'turns', 'angularTravel', 'omega', 'rotationalWork', 'rotationalPower'],
  units: ['powerKilowatts', 'powerWatts', 'timeMinutes', 'timeSeconds', 'speedCentimetres', 'speedMetres']
};
const MODES = ['unsaved', 'solution'];
const ROTARY = ['windlass', 'screw'];
function kinds(b) {
  return ['inputPower', 'usefulPower', 'lossPower', 'handSpeed', 'loadSpeed', 'budgetTime']
    .concat(ROTARY.includes(b.id) ? ['torque', 'rpm'] : [], FAMILIES.planning.slice(1),
      ROTARY.includes(b.id) ? FAMILIES.rotation.slice(2) : [], FAMILIES.power.slice(3), FAMILIES.units);
}
function version(kind) {
  return FAMILIES.units.includes(kind) ? 5 : FAMILIES.power.slice(3).includes(kind) ? 4
    : FAMILIES.rotation.slice(2).includes(kind) ? 3 : FAMILIES.planning.slice(1).includes(kind) ? 2 : 1;
}
function record(b, question, extra = {}) {
  // Solution snapshots may contain an unfinished draft; their setup and version must still validate.
  return { version: version(question), benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 },
    percent: 80, seconds: 5, budget: 100, question, answer: '', unit: '', hint: 0, completion: 'solution', ...extra };
}
function checked(b, question = 'inputPower', extra = {}) {
  // Independent expectations: useful work = load * 0.5 m; input work = useful / 0.8.
  const useful = b.settings[b.load] * 0.5, watts = useful / 0.8 / 5;
  const answer = { inputPower: watts, usefulPower: useful / 5, lossPower: watts - useful / 5,
    budgetEnergy: 100 * 5, loadFromPower: b.settings[b.load], timeMinutes: 5 / 60,
    turns: 0.5 / (b.id === 'screw' ? b.settings.screwPitch : 2 * Math.PI * b.settings.windlassDrumR) }[question];
  const unit = { budgetEnergy: 'J', loadFromPower: 'N', timeMinutes: 'min', turns: 'turns' }[question] || 'W';
  if (answer === undefined) throw Error('Independent checked fixture missing for ' + question);
  return record(b, question, { completion: 'checked', answer: String(answer), unit, ...extra });
}
function allSolutions(b) { return Object.fromEntries(kinds(b).map(kind => [kind, record(b, kind)])); }
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[4], extra = {}) {
  const store = newStore({ otherTool: { note: 'Keep this other tool' }, machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate), byId = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const action = key => find(n => n.type === 'button' && n.props[`data-ml-power-${key}`] !== undefined);
  const next = mode => find(n => n.props?.['data-ml-power-practice-next'] === mode);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { b, render, find, byId, action, next, invoke, awardXP, tryAward, state: () => store.toolData.machineLab, allState: () => store.toolData,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: key => invoke(action(key)), advance: mode => invoke(next(mode)),
    coverage: family => find(n => n.props?.['data-ml-power-family-coverage'] === family),
    track: family => find(n => n.props?.['data-ml-power-family-track'] === family),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'] };
}
function expectCoverage(s, family, want) {
  const coverage = s.coverage(family), total = FAMILIES[family].length;
  expect(coverage?.props).toMatchObject({ 'data-checked': want.checked, 'data-solution': want.solution, 'data-unsaved': want.unsaved, 'data-total': total });
  expect(text(coverage)).toMatch(new RegExp('Checked:\\s*' + want.checked, 'i'));
  expect(text(coverage)).toMatch(new RegExp('Solution viewed:\\s*' + want.solution, 'i'));
  expect(text(coverage)).toMatch(new RegExp('(?:Unsaved|No saved record):\\s*' + want.unsaved, 'i'));
  const track = s.track(family); expect(String(track?.props['aria-hidden'])).toBe('true');
  const segments = nodes(track).filter(n => n.props?.['data-ml-power-family-segment']);
  expect(segments.map(n => n.props['data-ml-power-family-segment'])).toEqual(['checked', 'solution', 'unsaved']);
  for (const segment of segments) {
    const key = segment.props['data-ml-power-family-segment'];
    expect(Number.parseFloat(segment.props.style.width)).toBeCloseTo(want[key] / total * 100, 10);
    expect([undefined, 0, '0', '0px']).toContain(segment.props.style.minWidth);
  }
  expect(segments.reduce((sum, n) => sum + Number.parseFloat(n.props.style.width), 0)).toBeCloseTo(100, 10);
}

describe('Machine Lab: practice coverage counts', () => {
  it.each(BENCHES)('shows all $id skills once and all-unsaved family proportions without modifying drafts', b => {
    const s = session(b); s.edit('answer', 'draft'); s.edit('unit', 'W'); s.click('hint'); const before = s.allState();
    const families = Object.keys(FAMILIES).filter(f => f !== 'rotation' || ROTARY.includes(b.id));
    expect(nodes(s.render()).filter(n => n.props?.['data-ml-power-family-coverage']).map(n => n.props['data-ml-power-family-coverage'])).toEqual(families);
    for (const family of families) expectCoverage(s, family, { checked: 0, solution: 0, unsaved: FAMILIES[family].length });
    expect(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual(kinds(b));
    expect(s.allState()).toBe(before); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('partitions independently verified versions one through five, invalid snapshots and missing skills', () => {
    const b = BENCHES[4], records = { inputPower: checked(b), usefulPower: record(b, 'usefulPower'), lossPower: checked(b, 'lossPower', { answer: '999' }),
      budgetEnergy: checked(b, 'budgetEnergy'), turns: checked(b, 'turns'), loadFromPower: checked(b, 'loadFromPower'),
      timeMinutes: checked(b, 'timeMinutes'), timeSeconds: record(b, 'timeSeconds'), arbitrary: record(b, 'inputPower') };
    const s = session(b, { benchPowerRecords: { [b.id]: records } }), before = s.allState();
    expectCoverage(s, 'power', { checked: 2, solution: 1, unsaved: 2 }); expectCoverage(s, 'motion', { checked: 0, solution: 0, unsaved: 2 });
    expectCoverage(s, 'planning', { checked: 1, solution: 0, unsaved: 4 }); expectCoverage(s, 'rotation', { checked: 1, solution: 0, unsaved: 6 });
    expectCoverage(s, 'units', { checked: 1, solution: 1, unsaved: 4 }); expect(s.allState()).toBe(before);
  });
  it('counts earlier setups for every station without borrowing other station evidence', () => {
    for (const b of BENCHES) {
      const fixed = checked(b), records = { [b.id]: { inputPower: fixed }, foreign: allSolutions(b) };
      const s = session(b, { [b.load]: b.settings[b.load] * 2, benchPowerRecords: records });
      expectCoverage(s, 'power', { checked: 1, solution: 0, unsaved: 4 });
      expect(s.find(n => n.props?.['data-ml-power-skill'] === 'inputPower').props['data-ml-power-skill-setup']).toBe('earlier');
      expect(s.state().benchPowerRecords).toBe(records); expect(s.state().benchPowerRecords[b.id].inputPower).toBe(fixed);
    }
  });
  it('rejects malformed evidence with the existing record validator and preserves storage', () => {
    const b = BENCHES[4], s = session(b);
    for (const patch of [{ version: 5 }, { benchId: 'screw' }, { question: 'usefulPower' }, { answer: '999' }, { unit: 'J' },
      { hint: 3 }, { seconds: 0 }, { percent: '80' }, { settings: { windlassLoad: 400 } }, { completion: 'mastered' }]) {
      const records = { [b.id]: { inputPower: checked(b, 'inputPower', patch) } }; s.patch({ benchPowerRecords: records });
      expectCoverage(s, 'power', { checked: 0, solution: 0, unsaved: 5 }); expect(s.state().benchPowerRecords).toBe(records);
    }
  });
  it('changes counts only after explicit saves and keeps viewed solutions distinct from checked answers', () => {
    const b = BENCHES[4], s = session(b); s.edit('answer', 50); s.edit('unit', 'W'); s.click('check');
    expect(s.result()).toBe('correct'); expectCoverage(s, 'power', { checked: 0, solution: 0, unsaved: 5 });
    s.click('save'); expectCoverage(s, 'power', { checked: 1, solution: 0, unsaved: 4 });
    s.edit('question', 'usefulPower'); s.click('reveal'); expectCoverage(s, 'power', { checked: 1, solution: 0, unsaved: 4 });
    s.edit('answer', 40); s.edit('unit', 'W'); s.click('check'); s.click('save');
    expectCoverage(s, 'power', { checked: 1, solution: 1, unsaved: 3 }); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
});

describe('Machine Lab: practice coverage navigation', () => {
  it.each(BENCHES)('visits all $id unsaved skills in calculation order and wraps once', b => {
    const s = session(b), ordered = kinds(b); expect(s.next('unsaved')?.type).toBe('button'); expect(s.next('unsaved').props.type).toBe('button');
    expect(text(s.next('unsaved'))).toContain('Next unsaved skill'); expect(text(s.next('solution'))).toContain('Revisit a worked solution');
    for (let i = 0; i < ordered.length; i++) {
      expect(s.byId('question').props.value).toBe(ordered[i]); const want = ordered[(i + 1) % ordered.length], next = s.next('unsaved');
      expect(next.props.disabled).toBe(false); expect(next.props['data-target']).toBe(want);
      const tile = s.find(n => n.props?.['data-ml-power-skill'] === want);
      expect(text(next.props.children[1])).toBe(text(tile.props.children[0].props.children[0]));
      s.advance('unsaved');
    }
    expect(s.byId('question').props.value).toBe('inputPower'); expect(s.state().benchPowerRecords).toBeUndefined();
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(MODES)('skips ineligible %s records, selects the nearest later target and wraps', mode => {
    const b = BENCHES[4], records = mode === 'unsaved' ? allSolutions(b) : { usefulPower: record(b, 'usefulPower'), powerKilowatts: record(b, 'powerKilowatts') };
    if (mode === 'unsaved') { delete records.usefulPower; delete records.powerKilowatts; }
    const s = session(b, { benchPowerRecords: { [b.id]: records } });
    expect(s.next(mode).props['data-target']).toBe('usefulPower'); s.advance(mode); expect(s.byId('question').props.value).toBe('usefulPower');
    expect(s.next(mode).props['data-target']).toBe('powerKilowatts'); s.advance(mode); expect(s.byId('question').props.value).toBe('powerKilowatts');
    expect(s.next(mode).props['data-target']).toBe('usefulPower'); s.advance(mode); expect(s.byId('question').props.value).toBe('usefulPower');
  });
  it.each(MODES.flatMap(mode => BENCHES.map(b => ({ mode, b, id: b.id }))))('disables $mode on $id with no other eligible target and preserves the current draft even if invoked', ({ mode, b }) => {
    const full = allSolutions(b), none = mode === 'unsaved' ? full : {}, currentOnly = mode === 'unsaved' ? { ...full } : { inputPower: record(b, 'inputPower') };
    if (mode === 'unsaved') delete currentOnly.inputPower;
    for (const records of [none, currentOnly]) {
      const answer = String(b.settings[b.load] * 0.5 / 0.8 / 5);
      const s = session(b, { benchPowerRecords: { [b.id]: records } }); s.edit('answer', answer); s.edit('unit', 'W'); s.click('hint'); s.click('check');
      const button = s.next(mode), before = s.allState(); expect(button.props.disabled).toBe(true); expect(button.props['data-target']).toBe('');
      expect(text(s.render())).not.toMatch(/undefined|NaN/); s.invoke(button); expect(s.allState()).toBe(before); expect(s.result()).toBe('correct');
      expect(s.byId('answer').props.value).toBe(answer); expect(s.byId('unit').props.value).toBe('W');
    }
  });
});

describe('Machine Lab: practice coverage latest draft', () => {
  it('clears only the selected station practice while retaining current assumptions, other stations and unrelated state', () => {
    const b = BENCHES[4], other = { question: 'turns', answer: 'draft elsewhere', custom: 'untouched' }, saved = { lever: { inputPower: checked(BENCHES[0]) } };
    const s = session(b, { benchPower: { screw: other }, benchPowerRecords: saved, designReflection: 'Keep my reflection' });
    s.edit('percent', '60'); s.edit('duration', '2'); s.edit('timeUnit', 'min'); s.edit('budget', '200');
    s.edit('answer', '123'); s.edit('unit', 'J'); s.click('hint'); s.click('check'); s.click('reveal');
    const before = s.allState(), oldSignature = s.state().benchPower[b.id].signature; s.advance('unsaved');
    const current = s.state().benchPower[b.id]; expect(current).toMatchObject({ question: 'usefulPower', percent: '60', duration: '2', timeUnit: 'min', budget: '200', answer: '', unit: '', hint: 0, checked: false, revealed: false });
    expect(current.signature).not.toBe(oldSignature); expect(JSON.parse(current.signature).at(-1)).toBe('usefulPower');
    expect(s.state().benchPower.screw).toBe(other); expect(s.state().benchPowerRecords).toBe(saved); expect(s.state().designReflection).toBe('Keep my reflection');
    expect(s.allState().otherTool).toBe(before.otherTool); for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(BASE[key]);
    expect(s.result()).toBeUndefined(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('revisits an earlier worked solution on the current setup without restoring or revealing its saved answer', () => {
    const b = BENCHES[4], fixed = record(b, 'usefulPower', { answer: 'old draft', hint: 2 }), saved = { [b.id]: { usefulPower: fixed } };
    const s = session(b, { windlassLoad: 800, benchPowerRecords: saved }); s.edit('percent', '40'); s.edit('duration', '10');
    s.advance('solution'); expect(s.byId('question').props.value).toBe('usefulPower'); expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe('');
    expect(s.state().windlassLoad).toBe(800); expect(s.byId('percent').props.value).toBe('40'); expect(s.byId('duration').props.value).toBe('10');
    expect(s.result()).toBeUndefined(); expect(s.find(n => n.props?.['data-ml-power-hint-level'] !== undefined)).toBeUndefined(); expect(s.state().benchPowerRecords).toBe(saved);
    expect(s.find(n => n.props?.['data-ml-power-skill'] === 'usefulPower').props['data-ml-power-skill-setup']).toBe('earlier');
  });
  it('recomputes an unsaved target against the latest records even when the button was not rendered again', () => {
    const b = BENCHES[4], s = session(b), old = s.next('unsaved'); expect(old.props['data-target']).toBe('usefulPower');
    const saved = { [b.id]: { usefulPower: checked(b, 'usefulPower') } }; s.patch({ benchPowerRecords: saved }); s.invoke(old);
    expect(s.byId('question').props.value).toBe('lossPower'); expect(s.state().benchPowerRecords).toBe(saved);
  });
  it('recomputes a solution target after a latest checked replacement and skips malformed solution evidence', () => {
    const b = BENCHES[4], s = session(b, { benchPowerRecords: { [b.id]: { usefulPower: record(b, 'usefulPower') } } }), old = s.next('solution');
    expect(old.props['data-target']).toBe('usefulPower'); const saved = { [b.id]: { usefulPower: checked(b, 'usefulPower'),
      lossPower: record(b, 'lossPower', { version: 5 }), timeMinutes: record(b, 'timeMinutes') } }; s.patch({ benchPowerRecords: saved }); s.invoke(old);
    expect(s.byId('question').props.value).toBe('timeMinutes'); expect(s.state().benchPowerRecords).toBe(saved);
  });
  it.each(MODES)('keeps identity when latest record replacement removes every other %s target', mode => {
    const b = BENCHES[4], s = session(b, { benchPowerRecords: { [b.id]: { usefulPower: record(b, 'usefulPower') } } });
    const old = s.next(mode); expect(old.props.disabled).toBe(false);
    s.edit('answer', 'keep this latest draft'); s.edit('unit', 'J'); s.click('hint');
    const records = mode === 'unsaved' ? allSolutions(b) : { inputPower: record(b, 'inputPower') };
    s.patch({ benchPowerRecords: { [b.id]: records } }); const before = s.allState(); s.invoke(old);
    expect(s.allState()).toBe(before); expect(s.byId('answer').props.value).toBe('keep this latest draft'); expect(s.byId('unit').props.value).toBe('J');
  });
});

describe('Machine Lab: practice coverage guarded state', () => {
  it.each([
    ['view', { view: 'learn' }], ['station', { bench: 'screw' }], ['geometry', { windlassHandleR: 0.6 }],
    ['efficiency', { benchPower: { windlass: { percent: '40' } } }], ['duration', { benchPower: { windlass: { duration: '10' } } }],
    ['time unit', { benchPower: { windlass: { timeUnit: 'min' } } }], ['budget', { benchPower: { windlass: { budget: '200' } } }],
    ['question', { benchPower: { windlass: { question: 'turns' } } }], ['invalid geometry', { windlassHandleR: 0 }],
    ['invalid efficiency', { benchPower: { windlass: { percent: '0' } } }], ['invalid duration', { benchPower: { windlass: { duration: '0' } } }]
  ])('ignores delayed navigation after %s changes without mutating state', (_name, patch) => {
    const b = BENCHES[4], s = session(b, { benchPowerRecords: { [b.id]: { usefulPower: record(b, 'usefulPower') } } });
    const callbacks = MODES.map(s.next); expect(callbacks.every(n => !n.props.disabled)).toBe(true); s.patch(patch); const before = s.allState();
    callbacks.forEach(s.invoke); expect(s.allState()).toBe(before); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('rejects captured input, save and repeated navigation handlers after changing the question', () => {
    const s = session(); s.edit('answer', '50'); s.edit('unit', 'W'); s.click('check');
    const input = s.byId('answer'), save = s.action('save'), check = s.action('check'), next = s.next('unsaved'); s.invoke(next); const before = s.allState();
    input.props.onChange({ target: { value: '999' } }); [save, check, next].forEach(s.invoke);
    expect(s.allState()).toBe(before); expect(s.state().benchPowerRecords).toBeUndefined(); expect(s.byId('question').props.value).toBe('usefulPower');
  });
});
